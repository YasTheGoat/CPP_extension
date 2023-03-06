// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { compileFiles } = require("./compilers");
const { executeCommand } = require("./utils.js");
const {
  SettingsTemplate,
  readFile,
  modifyFile,
} = require("./ymlFilesManager.js");
const { out } = require("./channels.js");
const fse = require("fs-extra");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

const supportedCompilers = ["g++", "clang++"];
var chosenCompiler;
var cppFiles = [];

var restart = false;

function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let runDis = vscode.commands.registerCommand("CPP-Compiler.run", () => {
    restart = false;
    run();
  });
  let restartDis = vscode.commands.registerCommand(
    "CPP-Compiler.restart",
    () => {
      restart = true;
      run();
    }
  );
  let executeDis = vscode.commands.registerCommand(
    "CPP-Compiler.execute",
    async () => {
      const workspaces = vscode.workspace.workspaceFolders;
      if (workspaces.length === 0) {
        vscode.window.showErrorMessage(
          "Open a cpp project before running this command"
        );
        return;
      }
      const choices = [];

      for (let i = 0; i < workspaces.length; i++) {
        const folderPath = workspaces[i].uri.fsPath;
        const name = folderPath.split("\\").at(-1);

        choices.push({ label: name, description: folderPath });
      }

      var workspace;
      if (choices.length === 1) {
        workspace = choices[0];
      } else if (choices.length > 1) {
        workspace = await vscode.window.showQuickPick(choices, {
          matchOnDetail: true,
          matchOnDescription: false,
        });
      }

      if (!workspace) {
        vscode.window.showErrorMessage(
          "You need to have a selected workspace to continue"
        );
        return;
      }

      verifyFolderStructue(workspace.description);
      const settings = readFile(
        path.join(workspace.description, "build/config/setting.yml")
      );
      if (
        fs.existsSync(
          path.join(
            workspace.description,
            "build/out/" + settings.name + ".exe"
          )
        )
      ) {
        const response = await executeCommand(
          "start " +
            path.join(
              workspace.description,
              "build/out/" + settings.name + ".exe"
            )
        );
      } else {
        vscode.window.showWarningMessage(
          "No exectubale file was found for " + workspace.label.toUpperCase()
        );
      }
    }
  );

  let configureDis = vscode.commands.registerCommand(
    "CPP-Compiler.configure",
    async () => {
      const workspaces = vscode.workspace.workspaceFolders;
      if (workspaces.length === 0) {
        vscode.window.showErrorMessage(
          "Open a cpp project before running this command"
        );
        return;
      }
      const choices = [];

      for (let i = 0; i < workspaces.length; i++) {
        const folderPath = workspaces[i].uri.fsPath;
        const name = folderPath.split("\\").at(-1);

        choices.push({ label: name, description: folderPath });
      }

      var workspace;
      if (choices.length === 1) {
        workspace = choices[0];
      } else if (choices.length > 1) {
        workspace = await vscode.window.showQuickPick(choices, {
          matchOnDetail: true,
          matchOnDescription: false,
        });
      }

      if (!workspace) {
        vscode.window.showErrorMessage(
          "You need to have a selected workspace to continue"
        );
        return;
      }

      if (fs.existsSync(path.join(workspace.description, "build"))) {
        fs.rmSync(path.join(workspace.description, "build"), {
          recursive: true,
          force: true,
        });
      }

      verifyFolderStructue(workspace.description);
      modifyFile(
        "name",
        workspace.label,
        path.join(workspace.description, "build/config/setting.yml")
      );
    }
  );

  context.subscriptions.push(runDis);
  context.subscriptions.push(restartDis);
  context.subscriptions.push(executeDis);
  context.subscriptions.push(configureDis);
}

const run = async () => {
  out.clear();
  const workspaces = vscode.workspace.workspaceFolders;

  if (workspaces.length === 0) {
    vscode.window.showErrorMessage(
      "Open a cpp project before running this command"
    );
    return;
  }

  const compilers = await findCompilers();

  if (compilers.length === 1) {
    chosenCompiler = compilers[0];
  } else if (compilers.length > 1) {
    chosenCompiler = await vscode.window.showQuickPick(compilers, {
      matchOnDescription: false,
      matchOnDetail: true,
    });
  }

  if (!chosenCompiler) {
    vscode.window.showErrorMessage(
      "No compatible compiler was found, Make sure to download g++ or llvm and add them to your environement variables"
    );
    return;
  }

  const workspacesChoices = [];

  for (let i = 0; i < workspaces.length; i++) {
    const folderPath = workspaces[i].uri.fsPath;
    const name = folderPath.split("\\").at(-1);

    workspacesChoices.push({ label: name, description: folderPath });
  }

  var workspace = [];
  if (workspacesChoices.length === 1) {
    workspace.push(workspacesChoices[0]);
  } else if (workspacesChoices.length > 1) {
    workspace.push(
      await vscode.window.showQuickPick(
        [...workspacesChoices, { label: "ALL" }],
        {
          matchOnDescription: false,
          matchOnDetail: true,
        }
      )
    );
    if (workspace[0]) {
      if (workspace[0].label === "ALL") {
        workspace = workspacesChoices;
      }
    }
  }
  if (workspace.length === 0 || !workspace[0]) {
    vscode.window.showErrorMessage(
      "You need to select a workspace to continue"
    );
    return;
  }

  out.show();
  for (let i = 0; i < workspace.length; i++) {
    const folderPath = workspace[i].description;
    cppFiles = [];
    findRelevantFiles(folderPath, "cpp");
    if (cppFiles.length === 0) {
      vscode.window.showWarningMessage(
        "There are no files ending in '.cpp' to compile"
      );
      return;
    }
    if (restart) {
      if (fs.existsSync(path.join(folderPath, "build/config/history.yml"))) {
        fs.unlinkSync(
          path.join(folderPath, "build/config/history.yml"),
          (err) => console.log(err)
        );
      }
    }
    verifyFolderStructue(folderPath);
    const settings = readFile(
      path.join(folderPath, "build/config/setting.yml")
    );
    const history = readFile(path.join(folderPath, "build/config/history.yml"));

    const res = await compileFiles(
      cppFiles,
      settings,
      history,
      chosenCompiler,
      folderPath
    );

    if (res === 0) {
      var ressources = [];
      settings.ressources.forEach((res) => {
        if (res !== "exemple") {
          const resName = res.split("\\").at(-1);
          const resPath = path.join(folderPath, res);
          const outPath = path.join(folderPath, "build/out/" + resName);
          if (fs.existsSync(outPath) && !fs.statSync(outPath).isDirectory()) {
            const resmTime = fs.statSync(resPath).mtime;
            const outmTime = fs.statSync(outPath).mtime;
            if (resmTime > outmTime) {
              ressources.push(resPath);
            }
          } else {
            ressources.push(resPath);
          }
        }
      });
      ressources.forEach((res) => {
        const resName = res.split("\\").at(-1);
        try {
          fse.copySync(res, path.join(folderPath, "build/out/" + resName), {
            overwrite: true,
          });
        } catch (err) {
          vscode.window.showErrorMessage(
            "Error while copyng the ressource folders : " + err
          );
        }
      });

      if (
        fs.existsSync(
          path.join(folderPath, "build/out/" + settings.name + ".exe")
        )
      ) {
        const response = await executeCommand(
          "start " +
            path.join(folderPath, "build/out/" + settings.name + ".exe")
        );
      } else {
        const name = folderPath.split("\\").at(-1);
        vscode.window.showWarningMessage(
          "No exectubale file was found for " + name.toUpperCase()
        );
      }
    }
  }
};

const findCompilers = async () => {
  var final = [];

  for (let i = 0; i < supportedCompilers.length; i++) {
    const res = await (
      await executeCommand(supportedCompilers[i] + " --version")
    ).res;

    if (res === 0) {
      final.push(supportedCompilers[i]);
    }
  }

  return final;
};

const findRelevantFiles = (startPath, filter) => {
  if (!fs.existsSync(startPath)) {
    console.log("no dir ", startPath);
    return;
  }
  var files = fs.readdirSync(startPath);
  for (var i = 0; i < files.length; i++) {
    var filename = path.join(startPath, files[i]);
    var stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      findRelevantFiles(filename, filter); //recurse
    } else if (filename.endsWith(filter)) {
      if (filter === "cpp") {
        cppFiles.push(filename);
      }
    }
  }
};

const verifyFolderStructue = (origin) => {
  if (!fs.existsSync(path.join(origin, "build"))) {
    fs.mkdirSync(path.join(origin, "build"), (err) => console.log(err));
  }
  if (!fs.existsSync(path.join(origin, "build/config"))) {
    fs.mkdirSync(path.join(origin, "build/config"), (err) => console.log(err));
  }
  if (!fs.existsSync(path.join(origin, "build/out"))) {
    fs.mkdirSync(path.join(origin, "build/out"), (err) => console.log(err));
  }
  if (!fs.existsSync(path.join(origin, "build/obj"))) {
    fs.mkdirSync(path.join(origin, "build/obj"), (err) => console.log(err));
  }
  if (!fs.existsSync(path.join(origin, "build/config/history.yml"))) {
    fs.writeFileSync(
      path.join(origin, "build/config/history.yml"),
      "# PLEASE DO NOT TOUCH THIS FILE",
      (err) => console.log(err)
    );
  }
  if (!fs.existsSync(path.join(origin, "build/config/setting.yml"))) {
    fs.writeFileSync(
      path.join(origin, "build/config/setting.yml"),
      SettingsTemplate,
      (err) => console.log(err)
    );
  }
  if (!fs.existsSync(path.join(origin, "build/config/info.txt"))) {
    fs.writeFileSync(
      path.join(origin, "build/config/info.txt"),
      infoTemplate,
      (err) => console.log(err)
    );
  }
};

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

const infoTemplate = `
Thank you for downloading this CPP extension \n
\n
This extension allows you to compile projects with as much files as you want. It currently supports g++ and clang++.\n
\n
Four commands are availabe:\n
  - CPP: Compile project  ->  This builds the executable for your project\n
  - CPP: Recompile project  -> this deletes the compilation history and rebuilds your project from scratch\n
  - CPP: Run project  -> Automatically finds the executable file and runs it\n
  - CPP: Configure project -> This creates the folders and the files necessary for the extension to work.\n

This extension also allows you to specify custom settings for the build. You can add include paths, dependency paths and librarys in the setting.yml file located in 'build/config' when you configure the project.\n
You can also specify ressources path. These ressources are then copied in the same directory as the executable('build/out')\n
\n
IMPORTANT -> When adding includes, dependencies, librarys or ressources, please follow the already existent exemple. Meaning that you have to put a tab space before, then this character '-' and then another space before entering your path.    [  - YOUR_PATH]\n 
IMPORTANT -> Do not , in any case , modify the history.yml file located in 'build/config'. This file keeps track of the compilations and allows this extension to decide which file to compile and which file not to compile.\n

NOTE -> We are currently working on adding dll and lib for the compilation.
\n

`;
