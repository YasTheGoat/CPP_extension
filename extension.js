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
var foundCompilers = [];
var foundWorkspaces = [];
var chosenCompiler;
var chosenWorkspace;
var cppFiles = [];

var restart = false;

var statusBarMenuCompiler;
var statusBarMenuWorkspace;
var statusBarMenuRun;
var statusBarMenuRerun;

function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json

  //STATUS BAR
  statusBarMenuCompiler = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  statusBarMenuWorkspace = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  statusBarMenuRun = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  statusBarMenuRerun = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );

  let runDis = vscode.commands.registerCommand("CPP-Compiler.run", async () => {
    const res = await askUser();
    if (res === 0) {
      restart = false;
      run();
    }
  });
  let restartDis = vscode.commands.registerCommand(
    "CPP-Compiler.restart",
    async () => {
      const res = await askUser();
      if (res === 0) {
        restart = true;
        run();
      }
    }
  );
  let executeDis = vscode.commands.registerCommand(
    "CPP-Compiler.execute",
    async () => {
      const res = await askUser();

      if (res === 0) {
        const path_ = foundWorkspaces.find(
          (item) => item.name === chosenWorkspace
        ).uri.fsPath;

        verifyFolderStructue(path_);
        const settings = readFile(path.join(path_, "build/config/setting.yml"));
        if (
          fs.existsSync(path.join(path_, "build/out/" + settings.name + ".exe"))
        ) {
          const response = await executeCommand(
            "start " + path.join(path_, "build/out/" + settings.name + ".exe")
          );
        } else {
          vscode.window.showWarningMessage(
            "No exectubale file was found for " + chosenWorkspace.toUpperCase()
          );
        }
      }
    }
  );

  let configureDis = vscode.commands.registerCommand(
    "CPP-Compiler.configure",
    async () => {
      const res = await askUser();

      if (res === 0) {
        const path_ = foundWorkspaces.find(
          (item) => item.name === chosenWorkspace
        ).uri.fsPath;
        if (fs.existsSync(path.join(path_, "build"))) {
          fs.rmSync(path.join(path_, "build"), {
            recursive: true,
            force: true,
          });
        }

        verifyFolderStructue(path_);
        modifyFile(
          "name",
          chosenWorkspace,
          path.join(path_, "build/config/setting.yml")
        );
      }
    }
  );

  let toggleCompilerStatusbar = vscode.commands.registerCommand(
    "CPP-Compiler.togglecompiler",
    async () => {
      foundCompilers = await findCompilers();
      const currCompiler = statusBarMenuCompiler.text;
      if (foundCompilers.length > 0) {
        if (foundCompilers.length === 1) {
          statusBarMenuCompiler.text = foundCompilers[0];
        } else {
          const index = foundCompilers.indexOf(currCompiler);
          if (index === foundCompilers.length - 1) {
            statusBarMenuCompiler.text = foundCompilers[0];
          } else {
            statusBarMenuCompiler.text = foundCompilers[index + 1];
          }
        }
      } else return;
    }
  );
  let toggleWorkspaceStatusbar = vscode.commands.registerCommand(
    "CPP-Compiler.toggleworkspace",
    async () => {
      foundWorkspaces = await vscode.workspace.workspaceFolders;
      const currWorkspace = statusBarMenuWorkspace.text;
      if (foundWorkspaces.length > 0) {
        if (foundWorkspaces.length === 1) {
          statusBarMenuWorkspace.text = foundWorkspaces[0];
        } else {
          const index = foundWorkspaces.indexOf(
            foundWorkspaces.find((item) => item.name === currWorkspace)
          );
          if (index === foundWorkspaces.length - 1) {
            statusBarMenuWorkspace.text = foundWorkspaces[0].name;
          } else {
            statusBarMenuWorkspace.text = foundWorkspaces[index + 1].name;
          }
        }
      } else return;
    }
  );
  let RunFromStatusBar = vscode.commands.registerCommand(
    "CPP-Compiler.runfromstatusbar",
    () => {
      chosenCompiler = statusBarMenuCompiler.text;
      chosenWorkspace = statusBarMenuWorkspace.text;

      if (chosenCompiler === "none") {
        vscode.window.showErrorMessage("There is no valid compiler selected");
        return;
      }
      if (chosenWorkspace === "none") {
        vscode.window.showErrorMessage("You need to choose a valid workspace");
        return;
      }

      restart = false;
      run();
    }
  );
  let ReRunFromStatusBar = vscode.commands.registerCommand(
    "CPP-Compiler.rerunfromstatusbar",
    () => {
      chosenCompiler = statusBarMenuCompiler.text;
      chosenWorkspace = statusBarMenuWorkspace.text;

      if (chosenCompiler === "none") {
        vscode.window.showErrorMessage("There is no valid compiler selected");
        return;
      }
      if (chosenWorkspace === "none") {
        vscode.window.showErrorMessage("You need to choose a valid workspace");
        return;
      }

      restart = true;
      run();
    }
  );

  context.subscriptions.push(statusBarMenuCompiler);
  context.subscriptions.push(statusBarMenuWorkspace);
  context.subscriptions.push(statusBarMenuRun);
  context.subscriptions.push(statusBarMenuRerun);

  context.subscriptions.push(runDis);
  context.subscriptions.push(restartDis);
  context.subscriptions.push(executeDis);
  context.subscriptions.push(configureDis);

  context.subscriptions.push(toggleCompilerStatusbar);
  context.subscriptions.push(toggleWorkspaceStatusbar);
  context.subscriptions.push(RunFromStatusBar);
  context.subscriptions.push(ReRunFromStatusBar);

  setupStatusBar();
}

const setupStatusBar = async () => {
  foundCompilers = await findCompilers();
  foundWorkspaces = await vscode.workspace.workspaceFolders;

  compiler = foundCompilers.length > 0 ? foundCompilers[0] : "none";
  workspace = foundWorkspaces.length > 0 ? foundWorkspaces[0].name : "none";

  statusBarMenuCompiler.text = compiler;
  statusBarMenuCompiler.tooltip = "Click To Toggle Compiler";
  statusBarMenuCompiler.command = "CPP-Compiler.togglecompiler";

  statusBarMenuWorkspace.text = workspace;
  statusBarMenuWorkspace.tooltip = "Click To Toggle Workspace";
  statusBarMenuWorkspace.command = "CPP-Compiler.toggleworkspace";

  statusBarMenuRun.text = "$(debug-start)";
  statusBarMenuRun.tooltip = "Click To Compile your project";
  statusBarMenuRun.command = "CPP-Compiler.runfromstatusbar";

  statusBarMenuRerun.text = "$(debug-restart)";
  statusBarMenuRerun.tooltip = "Click To ReCompile your project";
  statusBarMenuRerun.command = "CPP-Compiler.rerunfromstatusbar";

  statusBarMenuWorkspace.show();
  statusBarMenuCompiler.show();
  statusBarMenuRun.show();
  statusBarMenuRerun.show();
};

const askUser = async () => {
  chosenCompiler = null;
  chosenWorkspace = null;
  foundWorkspaces = await vscode.workspace.workspaceFolders;

  if (!foundWorkspaces) {
    vscode.window.showErrorMessage(
      "Open a cpp project before running this command"
    );
    return 1;
  }

  const foundCompilers = await findCompilers();

  if (foundCompilers.length === 1) {
    chosenCompiler = foundCompilers[0];
  } else if (foundCompilers.length > 1) {
    chosenCompiler = await vscode.window.showQuickPick(foundCompilers, {
      matchOnDescription: false,
      matchOnDetail: true,
    });
  }

  if (!chosenCompiler) {
    vscode.window.showErrorMessage(
      "No compatible compiler was found, Make sure to download g++ or llvm and add them to your environement variables"
    );
    return 1;
  }

  const workspacesChoices = [];

  for (let i = 0; i < foundWorkspaces.length; i++) {
    const folderPath = foundWorkspaces[i].uri.fsPath;
    const name = foundWorkspaces[i].name;

    workspacesChoices.push({ label: name, description: folderPath });
  }

  if (workspacesChoices.length === 1) {
    chosenWorkspace = workspacesChoices[0].label;
  } else if (workspacesChoices.length > 1) {
    const temp = await vscode.window.showQuickPick(workspacesChoices, {
      matchOnDescription: false,
      matchOnDetail: true,
    });

    chosenWorkspace = temp.label;
  }
  if (!chosenWorkspace) {
    vscode.window.showErrorMessage(
      "You need to select a workspace to continue"
    );
    return 1;
  }

  return 0;
};

const run = async () => {
  out.clear();
  out.show();

  cppFiles = [];

  const tempWorspaces = await vscode.workspace.workspaceFolders;

  const folderPath = tempWorspaces.find((item) => item.name === chosenWorkspace)
    .uri.fsPath;

  if (restart) {
    if (fs.existsSync(path.join(folderPath, "build/config/history.yml"))) {
      fs.unlinkSync(path.join(folderPath, "build/config/history.yml"), (err) =>
        console.log(err)
      );
    }
  }
  verifyFolderStructue(folderPath);

  const settings = await readFile(
    path.join(folderPath, "build/config/setting.yml")
  );
  const history = await readFile(
    path.join(folderPath, "build/config/history.yml")
  );

  findRelevantFiles(folderPath, "cpp");
  if (cppFiles.length === 0) {
    vscode.window.showWarningMessage(
      "There are no files ending in '.cpp' to compile"
    );
    return;
  }

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

    if (settings.application_type.toUpperCase() !== "EXE") {
      return;
    }

    if (
      fs.existsSync(
        path.join(folderPath, "build/out/" + settings.name + ".exe")
      )
    ) {
      if (settings.build.toUpperCase() === "DEBUG") {
        const config = vscode.workspace.getConfiguration("launch", workspace);
        var curr = [];
        const data = {
          name: "CPP_ Debug",
          type: "cppdbg",
          request: "launch",
          externalConsole: true,
          cwd: folderPath,
          program: path.join(folderPath, "build/out/" + settings.name + ".exe"),
          args: [],
          // "stopAtEntry": false,
          // "environment": [],
          // "externalConsole": false,
          MIMode: "gdb",
          launchCompleteCommand: "exec-run",
          setupCommands: [
            {
              description: "Enable pretty-printing for gdb",
              text: "-enable-pretty-printing",
              ignoreFailures: true,
            },
          ],
        };

        curr.push(data);

        await config.update("configurations", curr);

        const res = await vscode.commands.executeCommand(
          "workbench.action.debug.start",
          "CPP_ Debug"
        );
      } else {
        const response = await executeCommand(
          "start " +
            path.join(folderPath, "build/out/" + settings.name + ".exe")
        );
      }
    } else {
      const name = folderPath.split("\\").at(-1);
      vscode.window.showWarningMessage(
        "No exectubale file was found for " + name.toUpperCase()
      );
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
    var stat = fs.statSync(filename);
    if (stat.isDirectory()) {
      findRelevantFiles(filename, filter); //recurse
    } else if (filename.endsWith(filter)) {
      cppFiles.push(filename);
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
};

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
