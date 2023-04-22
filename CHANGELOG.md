# Change Log

Please reconfigure the project if you think you are missings settings or you are getting errors

## [Update 1.5.8]
    - The system that that fetches and filters the source files is now almost instantaneous.


## [Update 1.5.8]

    - Now , when compiling in release mode, the app runs automatically in the integrated terminal. Works on mac,linux and windows in my test.
    Debugging was not tested on mac and linux, it may work or not.

## [Update 1.5.7]

    - Improved the output, The outpur is now faster and there is no more flickering. Also
        added show_steps option in the settings.yml file. when set to true, the extension output the command
        that ran for each. Perfect for learning or for finding errors.

## [Update 1.5.2]

    - Added the option to see the commands step by step in the settings files.

## [Update 1.4.7]

    - Added support for c language
    - You need to switch to gcc or clang instead of g++ or clang++ to compile c projects

## [Update 1.4.6]

    - Now the extension should work on linux and mac
    but unfortnately, the debugging features are not
    available for now. The executable also won't run
    automatically.

## [Update 1.4.3]

    - Added a tracker for the file compilation
    - Added the time it took at the end of the build
    - Added colors to the outPut window

## [Update 1.4.0]

    - Fixed the command 'CPP_ : Run project'

## [Update 1.3.9]

    - Fixed with the debugger where the breakpoints would be ignored.

## [Update 1.3.5]

    - Fixed typoes in the readme file

## [Update 1.3.3]

    - Updated the readme . Added videos and better explanations

## [Update 1.3.0]

    - Added multithreaded compilation. All your files compile at the same time.
    - Fixed a bug with the compilation history
    - Added quick access buttons to the status bar (workspace, compiler, compile, recompile)

## [UPDATE 1.2.0]

    -Now you can decide between Debug and Release Mode -Release mode enables code optimization -Debug mode uses gdb to enable debugging functions(breakpoints, inspector, etc...)

    -Added an ignore section in the settings. It supports files or folders. These files or folder will be ignored by the compiler

    -Added support for creating dll or static librarys(slib) in g++. (Should work with clang++ but not tested)

    -Improved the history system

    -ENJOY 🎉🎉
