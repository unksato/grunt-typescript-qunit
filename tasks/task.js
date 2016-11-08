/**
 * grunt-typescript-qunit
 * Qunit test runner for TypeScript Codes
 */

 'use strict';

 var taskName = 'tsqunit';

 module.exports = function (grunt) {

   var fs = require('fs');

   if(fs.existsSync('./node_modules/grunt-contrib-qunit')){
     grunt.loadNpmTasks('grunt-contrib-qunit');
   }else{
     grunt.loadNpmTasks('grunt-typescript-qunit/node_modules/grunt-contrib-qunit');
   }
   if(fs.existsSync('./node_modules/grunt-qunit-junit')){
     grunt.loadNpmTasks('grunt-qunit-junit');
   }else{
     grunt.loadNpmTasks('grunt-typescript-qunit/node_modules/grunt-qunit-junit');
   }
   if(fs.existsSync('./node_modules/grunt-qunit-istanbul')){
     grunt.loadNpmTasks('grunt-qunit-istanbul');
   }else{
     grunt.loadNpmTasks('grunt-typescript-qunit/node_modules/grunt-qunit-istanbul');
   }
   if(fs.existsSync('./node_modules/grunt-ts')){
     grunt.loadNpmTasks('grunt-ts');
   }else{
     grunt.loadNpmTasks('grunt-typescript-qunit/node_modules/grunt-ts');
   }
   if(fs.existsSync('./node_modules/grunt-cover-ts')){
     grunt.loadNpmTasks('grunt-cover-ts');
   }else{
     grunt.loadNpmTasks('grunt-typescript-qunit/node_modules/grunt-cover-ts');
   }

  grunt.registerMultiTask(taskName,'',function(){
     var tsqunitConfig = grunt.config(taskName)[this.target];

     grunt.config.merge({
       ts : {
         tsqunit_build : {
           src : [tsqunitConfig.srcDir + '**/*.ts',tsqunitConfig.testDir + '**/*.ts'],
           options : {
             module : 'amd',
             target: 'es5',
             sourceMap: true,
             sourceRoot: './'
           }
         }
       },
       qunit: {
         options: {
           coverage: {
             src : tsqunitConfig.srcDir + '**/*.js',
             instrumentedFiles : tsqunitConfig.buildReportDir + 'instrument',
             htmlReport : tsqunitConfig.buildReportDir + 'coverage-html-reports',
             coberturaReport : tsqunitConfig.buildReportDir + 'cobertura-reports',
             lcovReport : tsqunitConfig.buildReportDir + 'lcov-reports',
             linesTresholdPct: 80
           }
         },
         tsqunit_target: [tsqunitConfig.testDir + '**/*.html']
       },
       qunit_junit: {
         options: {
           dest : tsqunitConfig.buildReportDir + 'junit-reports'
         }
       },
       cover_ts : {
          files : {
            src : tsqunitConfig.buildReportDir + 'lcov-reports/lcov.txt',
            dest : tsqunitConfig.buildReportDir + 'lcov-reports/lcov.ts.txt'
          }
        },
        tsqunithtml : tsqunitConfig
     })

     grunt.task.run('ts:tsqunit_build');
     grunt.task.run('tsqunithtml');
     grunt.task.run('qunit_junit');
     grunt.task.run('qunit:tsqunit_target');
     grunt.task.run('cover_ts');
   });

   grunt.registerTask('tsqunithtml', 'Create Qunit HTML for TypeScript Task', function () {
     var defaultQunitCssPath = './node_modules/grunt-typescript-qunit/node_modules/qunitjs/qunit/qunit.css';
     var defaultQunitJsPath = './node_modules/grunt-typescript-qunit/node_modules/qunitjs/qunit/qunit.js';
     var defaultSinonJsPath = './node_modules/grunt-typescript-qunit/node_modules/sinon/pkg/sinon-1.15.4.js';

     var testFileRegex = new RegExp('.*\\-test.ts$');

     var settings = grunt.config('tsqunithtml');

     var fs = require('fs'),
         path = require('path');

     if(settings == null) settings = {};
     if(!settings.qunitCssPath) settings.qunitCssPath = defaultQunitCssPath;
     if(!settings.qunitJsPath) settings.qunitJsPath = defaultQunitJsPath;
     if(!settings.sinonJsPath) settings.sinonJsPath = defaultSinonJsPath;
     if(settings.testFileSuffix) testFileRegex = new RegExp('.*\\' + settings.testFileSuffix + '$');
     if(settings.useSinon === undefined) settings.useSinon = true;

     var tsTestLoader = function(p) {
         if(!p.endsWith('/')){
             p = p + '/';
         }
         var arr = [];
         var fileList = fs.readdirSync(p);
         for (var i = 0; i < fileList.length; i++){
             var targetFilePath = path.join(p + fileList[i]);
             if(fs.statSync(targetFilePath).isDirectory()){
                 var ret = tsTestLoader(targetFilePath);
                 arr = arr.concat(ret);
                 continue;
             }

             if(fs.statSync(targetFilePath).isFile() && testFileRegex.test(fileList[i])){
                 arr.push(targetFilePath);
             }
         }
         return arr;
     };

     var getRefPath = function(target,dir,tsFiles){
       var reg = new RegExp(/ *\/\/\/ *< *reference +path="(.*?)" *\/>.*\r?\n/g);
       if(!dir)dir = path.parse(target).dir;
       var src = fs.readFileSync(target,'utf8');

       if(!tsFiles)
           tsFiles = [];

       var match;
       while(match = reg.exec(src)){
         var tsFile = path.resolve(path.join(dir,match[1]));
         if(tsFiles.indexOf(tsFile) == -1){
           tsFiles.push(tsFile);
           getRefPath(tsFile, path.join(path.parse(target).dir,path.parse(match[1]).dir),tsFiles);
         }
       }
       return tsFiles;
     };

     var createTestHtml = function(testTarget,srcTarget){

       var template =
 '<!DOCTYPE html>\n\
 <html>\n\
 <head>\n\
   <meta charset="utf-8">\n\
   <title>QUnit</title>\n\
   <link rel="stylesheet" href="${qunitcss}">\n\
 </head>\n\
 <body>\n\
 <div id="qunit"></div><div id="qunit-fixture"></div>\n\
 ${codes}\n\
 <script src="${qunitjs}"></script>\n\
 ${sinon}\n\
 ${tests}\n\
 </body>\n\
 </html>';
       var sinonScriptTemplate = '<script src="${sinonjs}"></script>\n';
       var scriptTemplate = '  <script src="${path}"></script>'

       var testScript = scriptTemplate.replace('${path}',testTarget.replace('.ts','.js'));
       var codeScript = '';

       for(var i = 0; i < srcTarget.length ;i++){
         codeScript += scriptTemplate.replace('${path}',srcTarget[i].replace('.ts','.js')) + '\n';
       }

       var sinon = settings.useSinon === true ? sinonScriptTemplate.replace('${sinonjs}',path.resolve(settings.sinonJsPath)) : '';

       var html = template.replace('${codes}',codeScript)
                 .replace('${tests}',testScript)
                 .replace('${qunitcss}',path.resolve(settings.qunitCssPath))
                 .replace('${qunitjs}',path.resolve(settings.qunitJsPath))
                 .replace('${sinon}',sinon);

       return html;
     };

     var writeTestHtml = function(tsFileName,data){

       var p = path.parse(tsFileName);
       var htmlPath = path.resolve(path.join(p.dir,p.name + '.html'));

       fs.writeFileSync(htmlPath,data);
     }

     var targetFiles = tsTestLoader(settings.testDir);

     for(var i = 0; i < targetFiles.length; i++){
       var srcList = getRefPath(targetFiles[i]);

       srcList = srcList.reverse();

       srcList = srcList.filter(function (x, i, self) {
           return self.indexOf(x) === i;
         });

       srcList = srcList.filter(function(ts){
         return ts.indexOf('.d.ts') === -1;
       });

       var body = createTestHtml(path.resolve(targetFiles[i]),srcList);

       writeTestHtml(targetFiles[i],body);
     }

   });
 };

 String.prototype.endsWith = function(suffix) {
   return this.indexOf(suffix, this.length - suffix.length) !== -1;
 };
