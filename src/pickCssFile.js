function pickCssFilename(css) {

	if (css instanceof Array) {
		if (css.includes('no-default') && css.includes('no-vendor')) {
			css.splice(css.indexOf('no-default'), 1);
			css.splice(css.indexOf('no-vendor'), 1);
			return '';
		}
		if (css.includes('no-vendor')) {
			css.splice(css.indexOf('no-vendor'), 1);
			return 'no-vendor';
		}
		if (css.includes('no-default')) {
			css.splice(css.indexOf('no-default'), 1);
			return 'no-default';
		}
	}

	return 'all';
}

module.exports = pickCssFilename;
