var fs = require('fs');
var findRoot = require('find-root');
var path = require('path');
var yaml = require('js-yaml');

function getOptions(inputPath, configPath) {

	if (configPath) {
		return getConfig(path.resolve(configPath));
	}

	// Places the config file could be, from highest priority to lowest
	var filenames = [
		'.lightshow',
		'.stylemark'
	]

	var extensions = [
		'.json',
		'.yaml',
		'.yml'
	]

	for (let f = 0; f < filenames.length; f++) {
		for (let e = 0; e < extensions.length; e++) {
			var configFilePath = path.resolve(inputPath, filenames[f] + extensions[e]);
			var options = getConfig(configFilePath);

			if (options) {
        options.baseDir = findRoot(configFilePath);
        console.log('Using config file: ' + configFilePath);
				return options;
			}
		}
	}

	// No options file found :(
	console.error('Missing configuration file');
	process.exit(1);
}


function getConfig(filepath) {
	if (!fs.existsSync(filepath)) {
		return false;
	}

	var contents = fs.readFileSync(filepath, 'utf8');
  var extension = filepath.split('.').pop();

	if (extension === 'yaml' || extension === 'yml') {
		return yaml.safeLoad(contents);
	}

	if (extension === 'json') {
		return JSON.parse(contents);
	}

  // The file isn't .yaml or .yml or .json ruh roh
	return false;
}

module.exports = getOptions;
