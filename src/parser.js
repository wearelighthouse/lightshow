'use strict';

var _ = require('lodash');
var Component = require('./component');
var matter = require('gray-matter');
var dir = require('node-dir');
var path = require('path');
var fs = require('fs');

class Parser {

	constructor(options = {}) {
		this.options = options || {};
	}

	/**
	 * @param {string} dirpath
	 * @param {object} options
	 * @param {Array} [options.match]
	 * @param {Array} [options.matchDir]
	 * @param {Array} [options.exclude]
	 * @param {Array} [options.excludeDir]
	 * @param {Function} callback
	 */
	parseDir(dirpath, callback = _.noop) {
		var docs = [];

		dir.readFiles(
			dirpath,
			{
				match: this.options.match,
				excludeDir: this.options.excludeDir,
			},
			(error, content, filepath, next) => {
				if (error) {
					console.error(error, error.stack);
					return next();
				}

				try {
					content = content.replace(/\r\n/g, '\n');  // Replaces Windows CRLF with Unix newlines

					let language = path.extname(filepath).substr(1);
					//console.log(path.basename(path.dirname(filepath)));
					docs = docs.concat(this.parse(content, language, filepath));
				}
				catch (e) {
					console.error(`Error parsing "${filepath}": ${e}`, e.stack);
				}

				next();
			},
			error => {
				callback(error, docs);
			}
		);
	}

	/**
	 * Parses components from source content.
	 *
	 * @param {String} source
	 * @param {String} [language]
	 * @param {String} filepath
	 * @return {Array.<Component>}
	 */
	parse(content, language, filepath) {
		var components = _(getDocBlocks(content, language))
			.map(docBlock => this._parseDocBlock(docBlock, filepath, language))
			.filter()
			.thru(Component.merge)
			.value();

		return components;
	}

	_parseDocBlock(docBlock, filepath, language) {

		if (!_.isString(docBlock)) {
			// Malformed docblock
			return null;
		}

		var markdown = matter(docBlock);
		var name = markdown.data.name;

		// If the name isn't set, and the file is a .md, just use the (cleaned up by namesFilter filename
		if (!name && isMarkdown(language)) {
			name = this.options.namesFormat(path.parse(filepath).name);
		}

		if (!name) {
			// A component must have a name!
			return null;
		}

		var component = new Component();
		component.setName(name);
		component.setCategory(markdown.data.category || this.options.namesFormat(path.basename(path.dirname(filepath))));
		component.setFilepath(filepath);

		var metadata = _.omit(markdown.data, ['name', 'category']);

		_.forEach(metadata, (value, key) => {
			if (_.isArray(value)) {
				// List
				_.forEach(value, (item) => component.addMeta(key, item));
			}
			else {
				// Single
				component.addMeta(key, value);
			}
		});

		var description = this._parseDescriptionMarkdown(markdown.content, component);
		component.setDescription(description);

		return component;
	}

	_parseDescriptionMarkdown(markdown, component) {
		var description = markdown;

		// Extracts blocks from description
		var blocks = description.match(/```(.*\n)+?```/g);

		var blocksByExample = {};
		var optionsByExample = {};

		const addBlocktoExample = (name, language, content, options) => {
			var block = {
				name: name,
				language: language,
				content: content,
				hidden: _.has(options, 'hidden'),
				noBox: _.has(options, 'no-box')
			};

			blocksByExample[name] = blocksByExample[name] || [];
			blocksByExample[name].push(block);
			optionsByExample[name] = optionsByExample[name] || {};

			var height = optionsByExample[name].height || options.height;
			if (height) {
				optionsByExample[name].height = height;
			}
		};

		const createBlockFromExternalSource = (name, language, content, optionsString) => {
			content = content || '';
			return `\`\`\`${name}.${language}${optionsString}\n${content.trimRight()}\n\`\`\``;
		};

		// Extracts examples from description blocks
		_.forEach(blocks, (block) => {
			/*
				Matches any of the following:

				Inline example:      <name>.<extension>
				External file:       <name>:<filepath>.<extension>
				External directory:  <name>:<filepath>/*

				where <filepath> can be an absolute path (`/foo/bar`) or relative path (`foo/bar`, `../foo`)
			*/
			var matches = block.match(/```\s*([^\.\s\:]+)(?:\:([^\s]+))?(?:(\*)|(?:\.(\w+)))(.*)\n/);
			var name = matches ? matches[1] : null;
			var externalSource = matches ? matches[2] : null;
			var externalSourceWildcard = matches ? matches[3] : null;
			var language = matches ? matches[4] : null;
			var optionsString = matches ? matches[5] : '';

			if (!name) {
				// Unnamed examples are not renderable
				return;
			}

			var options = _(optionsString)
				.split(' ')
				.transform((options, optionStr) => {
					var parts = optionStr.split('=');
					var name = parts[0];
					var value = parts[1];
					options[name] = value;
				}, {})
				.value();

			var content;

			if (externalSource) {
				var componentDir = path.dirname(component.getFilepath());
				if (externalSourceWildcard) {
					var externalSourceFiles = dir.files(path.resolve(componentDir, externalSource), {sync: true});
					var extractedExampleBlocks = [];
					_.forEach(externalSourceFiles, filepath => {
						var language = path.extname(filepath).substr(1);
						var content = fs.readFileSync(filepath, 'utf8');
						addBlocktoExample(name, language, content, options);
						extractedExampleBlocks.push(createBlockFromExternalSource(name, language, content, optionsString));
					});

					// replace the external source definition block in the description with the content from the external
					// sources matched by the wildcard
					var regexp = new RegExp('```\\s*' + name + '(.*\\n)+?```', 'gm');
					description = description.replace(regexp, () => extractedExampleBlocks.join('\n'));

					return;
				} else {
					var externalSourceFilename = `${externalSource}.${language}`;
					let sourcePath;

					if (externalSourceFilename[0] === '/') {
						// this is an absolute path, so resolve the source file relative to the base directory
						sourcePath = path.resolve(this.options.baseDir, externalSourceFilename.slice(1));

					} else {
						// otherwise, resolve the source file relative to the component file's directory
						sourcePath = path.resolve(componentDir, externalSourceFilename);
					}
					content = fs.readFileSync(sourcePath, 'utf8');

					// replace the external source definition block in the description with the content from the external source
					var regexp = new RegExp('```\\s*' + name + '\\:' + externalSource + '\\.' + language + '(.*\n)+?```', 'gm');
					description = description.replace(regexp, () => createBlockFromExternalSource(name, language, content, optionsString));
				}
			} else {
				content = block
					.replace(/```.*\n/m, '')  // Removes leading ```[language]
					.replace(/\n```.*/m, '');  // Removes trailing ```
			}

			addBlocktoExample(name, language, content, options);
		});

		_.forEach(blocksByExample, (blocks, exampleName) => {
			var options = optionsByExample[exampleName];
			component.addExample(exampleName, blocks, options);
		});

		var hasExample = {};

		// Adds <example> tags for renderable HTML examples
		_.forEach(component.getExamples(), (example, name) => {

			_.forEach(example.blocks, (block) => {

				var exampleClass = block.noBox ? 'no-box' : 'standard';

				var exampleHtml = example.options.height
					? `<example name="${name}" class="${exampleClass}" height="${example.options.height}"></example>\n`
					: `<example name="${name}" class="${exampleClass}"></example>\n`;

				description = description.replace(
					new RegExp('```\\s*' + name + '\\.(html|jsx|handlebars|hbs)', 'gm'),
					(match, language) => {
						if (hasExample[name]) {
							return '```' + name + '.' + language;
						}
						else {
							hasExample[name] = true;
							return exampleHtml + '```' + name + '.' + language;
						}
					}
				);

			});

		});

		// Removes hidden blocks
		description = description.replace(/\n?```[^\n]+hidden(?:.*\n)+?```/g, '');

		// Removes custom block annotations
		description = description.replace(/```([^\.\s,]+)\.(\w+)(?:,? ?(\S+))?/g, '```$1.$2');

		return description;
	}
}

function getDocBlocks(content, language) {
	return isMarkdown(language)
		? getMarkdownDocBlocks(content)
		: getSourceCodeDocBlocks(content);
}

function isMarkdown(language) {
	return _.includes(['markdown', 'mdown', 'md'], language);
}

function getMarkdownDocBlocks(content) {
	return [content];
}

function getSourceCodeDocBlocks(content) {
	var docBlocks = content.match(/\/\*([\s\S]+?)\*\//g);

	// Removes extraneous asterisks from the start & end of comment blocks
	docBlocks = _.map(docBlocks, (docBlock) => /\/\*[\s\*]*([\s\S]+?)?[ \t\*]*\*\//g.exec(docBlock)[1]);

	return docBlocks;
}

module.exports = Parser;
