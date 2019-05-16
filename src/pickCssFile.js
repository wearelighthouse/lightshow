function pickCssFilename(exclude) {

	if (typeof exclude === string) {
		if (exclude === 'all') {
			return '';
		} else {
			return 'no-' + excludes;
		}
	}

	if (typeof exclude === array) {
		if (exclude.includes('all')) {
			return '';
		}
		if (exclude.includes('default') && exclude.includes('vendor')) {
			return '';
		}
		if (exclude.includes('vendor')) {
			return 'no-vendor';
		}
		if (exclude.includes('default')) {
			return 'no-default';
		}
	}

	return 'all';
}

module.exports = pickCssFilename;
