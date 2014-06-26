/*jslint node: true */
'use strict';

var pkg = require('./package.json');

//Using exclusion patterns slows down Grunt significantly
//instead of creating a set of patterns like '**/*.js' and '!**/node_modules/**'
//this method is used to create a set of inclusive patterns for all subdirectories
//skipping node_modules, bower_components, dist, and any .dirs
//This enables users to create any directory structure they desire.
var createFolderGlobs = function(folder, fileTypePatterns) {
  fileTypePatterns = Array.isArray(fileTypePatterns) ? fileTypePatterns : [fileTypePatterns];
  var ignore = ['node_modules','/app/bower_components','dist','temp'];
  var fs = require('fs');
  return fs.readdirSync(process.cwd() + '/' + folder)
  .map(function(file){
    
    if (ignore.indexOf(file) !== -1 ||
      file.indexOf('.') === 0 ||
      !fs.lstatSync(folder + '/' + file).isDirectory()) {
      return null;
  } else {
    return fileTypePatterns.map(function(pattern) {
      return file + '/**/' + pattern;
    });
  }
})
  .filter(function(patterns){
    return patterns;
  })
  .concat(fileTypePatterns);
};
var proxySnippet = require('grunt-connect-proxy/lib/utils').proxyRequest;
var corsSnippet = function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
};

module.exports = function (grunt) {

  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    connect: {
      main : {
        options : {
          port: 9001          
        }            
      },
      livereload : {
        main : {
          options : {
            open: true,
            base: [
              '.tmp',
              'app/'
            ],
            middleware: function(connect) {
              return [
                corsSnippet,
                connect.static(require('path').resolve('app/'))            
              ];
            }
          }
        }
      }
    },

    watch: {
      main: {
        options: {
          spawn: true,
          livereload: true 
        },
        files: [createFolderGlobs('app', ['*.js','*.less','*.html']),'!_SpecRunner.html','!.grunt'],
        tasks: [] //all the tasks are run dynamically during the watch event handler
      }
    },
    open: {
      main: {
        // Gets the port from the connect configuration
        path: 'http://localhost:<%= connect.main.options.port%>/app'
      }
    },
    jshint: {
      main: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: [createFolderGlobs('app', '*.js'),'!**/test/**']
      }
    },
    clean: {
      before:{
        src:['dist','temp']
      },
      after: {
        src:['temp']
      }
    },
    less: {
      production: {
        options: {
        },
        files: {
          'temp/style/app.css': 'app/style/app.less'
        }
      }
    },
    ngtemplates: {
      main: {
        options: {
          module: pkg.name,
          htmlmin:'<%= htmlmin.main.options %>'
        },
        src: [createFolderGlobs('app', '*.html'),'!index.html','!_SpecRunner.html'],
        dest: 'temp/templates.js'
      }
    },
    copy: {
      main: {
        files: [
        {src: ['app/img/**'], dest: 'dist/'},
        {src: ['app/bower_components/font-awesome/fonts/**'], dest: 'dist/',filter:'isFile',expand:true},
        {src: ['app/bower_components/bootstrap/fonts/**'], dest: 'dist/',filter:'isFile',expand:true},
        {src: ['app/data/**'], dest: 'dist/', filter:'isFile',expand:true}
          //{src: ['bower_components/angular-ui-utils/ui-utils-ieshiv.min.js'], dest: 'dist/'},
          //{src: ['bower_components/select2/*.png','bower_components/select2/*.gif'], dest:'dist/css/',flatten:true,expand:true},
          //{src: ['bower_components/angular-mocks/angular-mocks.js'], dest: 'dist/'}
          ]
        }
      },
      dom_munger:{
        read: {
          options: {
            read:[
            {selector:'script[data-build!="exclude"]',attribute:'src',writeto:'appjs'},
            {selector:'link[rel="stylesheet"]',attribute:'href',writeto:'appcss'}
            ]
          },
          src: 'index.html'
        },
        update: {
          options: {
            remove: ['script[data-remove!="exclude"]','link'],
            append: [
            {selector:'body',html:'<script src="js/app.full.min.js"></script>'},
            {selector:'head',html:'<link rel="stylesheet" href="style/app.full.min.css">'}
            ]
          },
          src:'app/index.html',
          dest: 'dist/index.html'
        }
      },
      cssmin: {
        main: {
          src:['temp/style/app.css','<%= dom_munger.data.appcss %>'],
          dest:'dist/style/app.full.min.css'
        }
      },
      concat: {
        main: {
          src: ['<%= dom_munger.data.appjs %>','<%= ngtemplates.main.dest %>'],
          dest: 'temp/js/app.full.js'
        }
      },
      ngmin: {
        main: {
          src:'temp/js/app.full.js',
          dest: 'temp/js/app.full.js'
        }
      },
      uglify: {
        main: {
          src: 'temp/js/app.full.js',
          dest:'dist/js/app.full.min.js'
        }
      },
      htmlmin: {
        main: {
          options: {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
          },
          files: {
            'dist/index.html': 'dist/index.html'
          }
        }
      },
      imagemin: {
        main:{
          files: [{
            expand: true, cwd:'dist/',
            src:['**/{*.png,*.jpg}'],
            dest: 'dist/'
          }]
        }
      },
      jasmine: {
        unit: {
          src: ['<%= dom_munger.data.appjs %>','bower_components/angular-mocks/angular-mocks.js'],
          options: {
            keepRunner: false,
            specs: createFolderGlobs('test', '*-spec.js')
          }
        }
      }
    });

grunt.registerTask('build',['jshint','clean:before','less','dom_munger','ngtemplates','cssmin','concat','ngmin','uglify','copy','htmlmin','imagemin','clean:after']);
grunt.registerTask('serve', ['dom_munger:read','jshint','connect', 'open', 'watch']);
grunt.registerTask('test',['dom_munger:read','jasmine']);


grunt.event.on('watch', function(action, filepath) {
    //https://github.com/gruntjs/grunt-contrib-watch/issues/156

    if (filepath.lastIndexOf('.js') !== -1 && filepath.lastIndexOf('.js') === filepath.length - 3) {

      //lint the changed js file
      grunt.config('jshint.main.src', filepath);
      grunt.task.run('jshint');

      //find the appropriate unit test for the changed file
      var spec = filepath;
      if (filepath.lastIndexOf('-spec.js') === -1 || filepath.lastIndexOf('-spec.js') !== filepath.length - 8) {
        spec = filepath.substring(0,filepath.length - 3) + '-spec.js';
      }

      //if the spec exists then lets run it
      if (grunt.file.exists(spec)) {
        grunt.config('jasmine.unit.options.specs',spec);
        grunt.task.run('jasmine:unit');
      }
    }

    //if index.html changed, we need to reread the <script> tags so our next run of jasmine
    //will have the correct environment
    if (filepath === 'index.html') {
      grunt.task.run('dom_munger:read');
    }

  });
};
