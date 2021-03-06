'use strict';
module.exports = function (grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);
    require('load-grunt-config')(grunt);

    // By default, lint and run all tests.
    grunt.registerTask('lint', ['jshint', 'jscs']);
    grunt.registerTask('test', ['mochacli']);
    grunt.registerTask('default', ['lint', 'test']);
};
