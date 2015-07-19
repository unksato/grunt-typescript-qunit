/**
 * grunt-typescript-qunit
 * Qunit test runner for TypeScript Codes
 */

 'use strict';

 var taskName = 'tsqunit';

 module.exports = function (grunt) {

   grunt.loadNpmTasks('grunt-contrib-qunit');
   grunt.loadNpmTasks('grunt-qunit-junit');
   grunt.loadNpmTasks('gtunt-ts');

   grunt.initConfig({
     ts : {
       tsqunit_build : {
         src : [],
         options : {
           module : 'amd',
           target: 'es5'
         }
       }
     },

     qunit: {
       options: {
         coverage: {
           src : [],
           linesTresholdPct: 80
         }
       },
       tsqunit_target: [],
     },
     qunit_junit: {
       options: {
       }
     }
   });

   grunt.registerTask(taskName,'',function(){
     var tsqunitConfig = grunt.config(taskName);
     var tsConfig = grunt.config('ts')['tsqunit_build'];
     var qunitConfig = grunt.config('qunit');
     var qunitJunitConfig = grunt.config('qunit_junit');

     tsConfig.src.push(tsqunitConfig.srcDir + '/**/*.ts');
     tsConfig.src.push(tsqunitConfig.testDir + '/**/*.ts');
     qunitConfig.options.coverage.src.push(tsqunitConfig.srcDir + '/**/*.ts');
     qunitConfig.options.coverage.instrumentedFiles = tsqunitConfig.buildReportDir + '/instrument';
     qunitConfig.options.coverage.htmlReport = tsqunitConfig.buildReportDir + '/coverage-html-reports';
     qunitConfig.options.coverage.coberturaReport = tsqunitConfig.buildReportDir + '/cobertura-reports';
     qunitCongig.tsqunit_target.push(tsqunitConfig.testDir + '/**/*.html');
     qunitJunitConfig.options.dest = tsqunitConfig.buildReportDir + '/junit-reports';

     grunt.task.run('ts:tsqunit_build');

     grunt.task.run('tsqunithtml');

     grunt.task.run('qunit_junit');

     grunt.task.run('qunit:tsqunit_target');

   });

   grunt.registerTask('tsqunithtml', 'Create Qunit HTML for TypeScript Task', function () {
     var defaultQunitCssPath = './node_modules/grunt-typescript-qunit-html/node_modules/qunitjs/qunit/qunit.css';
     var defaultQunitJsPath = './node_modules/grunt-typescript-qunit-html/node_modules/qunitjs/qunit/qunit.js';
     var defaultSinonJsPath = './node_modules/grunt-typescript-qunit-html/node_modules/sinon/pkg/sinon-1.15.4.js';

     var testFileRegex = new RegExp('.*\\-test.ts$');

     var settings = grunt.config(taskName);

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

     var getRefPath = function(target,dir){
       var reg = new RegExp(/ *\/\/\/ *< *reference +path="(.*?)" *\/>.*\n/g);
       if(!dir)dir = path.parse(target).dir;
       var src = fs.readFileSync(target,'utf8');
       var tsFiles = [];

       var match;

       while(match = reg.exec(src)){
         var tsFile = path.resolve(path.join(dir,match[1]));
         tsFiles.push(tsFile);
         var ret = getRefPath(tsFile, path.join(path.parse(target).dir,path.parse(match[1]).dir));
         tsFiles = tsFiles.concat(ret);
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
