Welcome to my CPP extension ! 🚀🚀

# INFO

This extension allows you to build your cpp projects. Your project can contain an infinite amount of files and my extension will automatically find them all.
You can add include paths, librarys paths, librarys names, preprocessors, and ignore paths which will be ignored in the build.
You can specify an application type. It can either be an executable, a dynamic library or a static library **(exe, dll, slib)**

_This extension also support Debug and Release mode_

- Debug exposes the code to the gdb compiler and enables debugging features such as breakpoint and others.
- Release mode optimizes and and reduces your application size when possible. This mode should be used when the project is ready to be published

One of the best features is the compilation history. It's a file that allows CPP extension to decide wich to compile nad which file no to compile making the build time faster.
And Finally, this extension compiles your files in parallel (asynchronously), which makes the build time even faster.

# COMMANDS

Four commands are availabe:
-'CPP : Compile project' -> This builds the executable for your project
-'CPP : Recompile project' -> this deletes the compilation history and rebuilds your project from scratch
-'CPP : Run project' -> Automatically finds the executable file and runs it
-'CPP : Configure project' -> This creates the folders and the files necessary for the extension to work.

You can also use the quick access buttons availabe in the status bar.
