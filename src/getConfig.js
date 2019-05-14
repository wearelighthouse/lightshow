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

      console.log("looking for: " + configFilePath);

			var options = getConfig(configFilePath);

			if (options) {
				console.log('Found and loaded config file: ' + configFilePath);
        options.baseDir = findRoot(configFilePath);
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
    console.log("Not found");
		return false;
	}

  console.log("Found! Reading...");

	var contents = fs.readFileSync(filepath, 'utf8');
  var extension = filepath.split('.').pop();

  console.log("Extension: " + extension);

	if (extension === 'yaml' || extension === 'yml') {
		return yaml.safeLoad(contents);
	}

	if (extension === 'json') {
		return JSON.parse(contents);
	}

  // The file path isn't yaml or json uhhh
	return false;
}

module.exports = getOptions;
