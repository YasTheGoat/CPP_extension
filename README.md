Welcome to CPP\_ extension ! 🚀🚀

This extension allows you to compile projects with as much files as you want. It currently supports g++ and clang++.

Four commands are availabe:

- `CPP_ : Compile project` -> This builds the executable for your project
- `CPP_ : Recompile project` -> this deletes the compilation history and rebuilds your project from scratch
- `CPP_ : Run project` -> Automatically finds the executable file and runs it
- `CPP_ : Configure project` -> This creates the folders and the files necessary for the extension to work.

This extension also allows you to specify custom settings for the build. You can add include paths, dependency paths and librarys in the setting.yml file located in 'build/config' when you configure the project.

You can also specify ressources path. These ressources are then copied in the same directory as the executable('build/out')

**IMPORTANT** -> When adding includes, dependencies, librarys or ressources, please follow the already existent exemple. Meaning that you have to put a tab space before, then this character '-' and then another space before entering your path. [ - YOUR_PATH]

**IMPORTANT** -> Do not , in any case , modify the history.yml file located in 'build/config'. This file keeps track of the compilations and allows this extension to decide which file to compile and which file not to compile.

_NOTE_ -> We are currently working on adding dll and lib for the compilation.
