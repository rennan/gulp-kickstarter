var

	// Native dependences

	path = require('path'),

	// Configuration

	config = require('./gulpfile.config.json'),

	// Dependences

	gulp = require('gulp'),

	spritesmith = require('gulp.spritesmith'),

	imagemin = require('gulp-imagemin'),

	plumber = require('gulp-plumber'),

	concat = require('gulp-concat'),

	sourcemaps = require('gulp-sourcemaps'),

	sass = require('gulp-sass'),

	autoprefixer = require('gulp-autoprefixer'),

	uglify = require('gulp-uglify'),

	htmlmin = require('gulp-htmlmin'),

	htmlpretty = require('gulp-html-beautify'),

	browserSync = require('browser-sync').create(),

	nunjucksRender = require('gulp-nunjucks-render'),

	modRewrite  = require('connect-modrewrite'),

	changed = require('gulp-changed'),

	watch = require('gulp-watch'),

	gulpif = require('gulp-if'),

	Fontmin = require('fontmin'),

	fontmin = new Fontmin(),

	del = require('del'),

	// Path

	pathConfig = config.path,

	applicationPath = pathConfig.application,

	sourcePath = path.join(applicationPath, pathConfig.source),

	distributionPath = path.join(applicationPath, pathConfig.distribution),

	assetsSourcePath = path.join(sourcePath, pathConfig.assets),

	assetsDistributionPath = path.join(distributionPath, pathConfig.assets),

	imagesSourcePath = path.join(assetsSourcePath, pathConfig.images),

	imagesDistributionPath = path.join(assetsDistributionPath, pathConfig.images),

	scriptsSourcePath = path.join(assetsSourcePath, pathConfig.scripts),

	librariesSourcePath = path.join(assetsSourcePath, pathConfig.libraries),

	pluginsSourcePath = path.join(assetsSourcePath, pathConfig.plugins),

	scriptsDistributionPath = path.join(assetsDistributionPath, pathConfig.scripts),

	stylesheetsSourcePath = path.join(assetsSourcePath, pathConfig.stylesheets),

	stylesheetsDistributionPath = path.join(assetsDistributionPath, pathConfig.stylesheets);

// Tasks

gulp

	.task('sprites', function() {

		var

			sprite = gulp

				.src(path.join(imagesSourcePath, pathConfig.sprites, '**', '*.png'))

				.pipe(
					spritesmith({
						padding: 6,
						'imgName': path.join('..', pathConfig.images, config.sprites.image),
						'cssName': config.sprites.stylesheet,
						'algorithm': 'binary-tree',
						'cssVarMap': function(item) {

							if (item.name.indexOf('-hover') !== -1)

								item.name = item.name.replace('-hover', ':hover') + ',' + '.' + item.name.replace('-hover', '.active');

						}
					})
				);

		sprite.img.pipe(gulp.dest(imagesDistributionPath));

		sprite.css.pipe(gulp.dest(path.join(stylesheetsSourcePath)));

	})

	.task('images', function() {

		gulp

			.src(path.join(imagesSourcePath, '*.{jpg,png,svg}'))

			.pipe(changed(imagesDistributionPath))

			.pipe(imagemin(config.images))

			.pipe(gulp.dest(imagesDistributionPath));

	})

	.task('stylesheets', function() {

		gulp

			.src([
				path.join(sourcePath, '**', '*.scss'),
				'!' + path.join(assetsSourcePath, '**', '*.scss')
			])

			.pipe(plumber())

			.pipe(changed(stylesheetsSourcePath))

			.pipe(concat('_templates.scss'))

			.pipe(gulp.dest(stylesheetsSourcePath))

			.on('end', function() {

				gulp

					.src(path.join(stylesheetsSourcePath, '**', '*.scss'))

					.pipe(plumber())

					.pipe(changed(stylesheetsDistributionPath))

					.pipe(sass(config.stylesheets).on('error', sass.logError))

					.pipe(autoprefixer('last 3 versions'))

					.pipe(gulp.dest(stylesheetsDistributionPath))

					.on('end', function() {

						del(path.join(stylesheetsSourcePath, '_templates.scss'));

					});

			});

	})

	.task('scripts', function() {

		gulp

			.src([
				path.join(librariesSourcePath, '**', '*.js'),
				path.join(pluginsSourcePath, '**', '*.js'),
				path.join(scriptsSourcePath, '**', '*.js')
			])

			.pipe(plumber())

			.pipe(sourcemaps.init())

			.pipe(concat('application.js'))

			.pipe(uglify())

			.pipe(sourcemaps.write('./'))

			.pipe(gulp.dest(scriptsDistributionPath));

	})

	.task('external-resources', ['update-config'], function() {

		for (var index in config.externalResources) {

			var destination = path.join(assetsDistributionPath, pathConfig.externalResources, index);

			gulp

				.src(config.externalResources[index])

				.pipe(changed(destination))

				.pipe(gulp.dest(destination));

		}

	})

	.task('concat', ['update-config'], function() {

		for (var index in config.concat) {

			var isJS = index.indexOf('.js') == -1 ? false : true;

			gulp

				.src(config.concat[index])

				.pipe(plumber())

				.pipe(sourcemaps.init())

				.pipe(concat(path.basename(index)))

				.pipe(gulpif(isJS, uglify()))

				.pipe(sourcemaps.write('./'))

				.pipe(gulp.dest(path.join(distributionPath, path.dirname(index))));
			}

	})

	.task('views', function() {

		gulp

			.src(path.join(sourcePath, '**', '*.html'))

			.pipe(changed(distributionPath))

			.pipe(plumber())

			.pipe(htmlmin(config.views))

			.pipe(
				cheerio(function($) {

					$('[hljs]').each(function() {

						var

							html = $(this).html(),

							lines = html.split(/\n/),

							indentation = [];

						for (var index = 0, size = lines.length; index < size; index++) {

							var tab = lines[index].replace(/^([\t\r]*).*$/, '$1').length;

							if (tab > 1) indentation.push(tab);

						}

						$(this).html(
							html
								.replace(new RegExp('^[\\t\\r]{' + (Math.min.apply(null, indentation) + 1) + '}(.*)$', 'gm'), '$1')

								.replace(/[\t\r]+$/, '')
						);

					});

				})
			)

			.pipe(gulp.dest(distributionPath));

	})

	.task('nunjucks', function() {

		nunjucksRender.nunjucks.configure(['application/source/templates/'], {
			watch: false,
			lstripBlocks: true,
			throwOnUndefined: true,
			trimBlocks: true,
			stream: true
		});

		return gulp.src('application/source/pages/*.+(html|nunjucks)')

		.pipe(nunjucksRender({
			path: ['application/source/pages/', 'application/source/templates/']
		}))

		.pipe(htmlpretty({
			indentSize: 4,
			indent_char: ' ',
			indent_with_tabs: false,
			preserve_newlines: false
		}))

		.pipe(gulp.dest(distributionPath));

		//gulp

			// .src(path.join(sourcePath, '**', '*.html'))

			// .pipe(changed(distributionPath))

			// .pipe(plumber())

			// .pipe(htmlmin(config.views))

			// .pipe(gulp.dest(distributionPath));

	})

	.task('fonts', function() {

		fontmin

			.src(path.join(assetsSourcePath, pathConfig.fonts, '**', '*.ttf'), {
				'base': path.join(assetsSourcePath, pathConfig.fonts)
			})

			.dest(path.join(assetsDistributionPath, pathConfig.fonts));

		fontmin

			.run(function(error, files) {

				if (error)

					throw error;

			});

	})

	.task('favicon', function() {

		gulp

			.src(path.join(sourcePath, 'favicon.ico'), {
				'base': sourcePath
			})

			.pipe(gulp.dest(distributionPath));

	})

	.task('browser', function() {

		var options = config.browser;

		options.files = [
			path.join(distributionPath, '**', '*.{html,css,js}')
		];

		options.server = {
			'baseDir': distributionPath,
			'middleware': [
				modRewrite([
					'^([^.]+)$ /index.html [L]'
				])
			],
			'routes': {
				'/application': distributionPath
			}
		};

		browserSync.init(options);

	})

	.task('update-config', function() {

		config = require('./gulpfile.config.json');

	})

	.task('watch', function() {

		watch(path.join(imagesSourcePath, pathConfig.sprites, '**', '*.png'), function() {

			gulp.start('sprites');

		});

		watch(path.join(imagesSourcePath, '**', '*.{jpg,png,svg}'), function() {

			gulp.start('images');

		});

		watch([
			path.join(sourcePath, '**', '*.scss'),
			'!' + path.join(stylesheetsSourcePath, '_templates.scss')
		], function() {

			gulp.start('stylesheets');

		});

		watch(path.join(sourcePath, '**', '*.js'), function() {

			gulp.start('scripts');

		});

		watch('gulpfile.config.json', function() {

			gulp.start(['external-resources', 'concat']);

		});

		watch(path.join(sourcePath, '**', '*.html'), function() {

			gulp.start('nunjucks');

		});

		watch(path.join(sourcePath, 'favicon.ico'), function() {

			gulp.start('favicon');

		});

	})

	.task('build', ['scripts', 'nunjucks', 'favicon', 'fonts', 'sprites', 'images', 'stylesheets'])

	.task('default', ['browser', 'watch']);
