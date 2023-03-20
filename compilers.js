const { executeCommand, getNameByPath } = require("./utils.js");
const { out } = require("./channels.js");
const path = require("path");
const fs = require("fs");
const { modifyFile } = require("./ymlFilesManager");
const vscode = require("vscode");
const showInterface = (lines) => {
  out.clear();
  lines.forEach((line) => {
    out.appendLine(line);
  });
};

var filesToUpdate = [];

class COMPILER {
  async run(settings, files, origin, compiler) {
    filesToUpdate = [];
    var msg = [];
    var projectName = getNameByPath(origin).toUpperCase();
    let lines = [
      "",
      "",
      "Building " +
        projectName +
        " project in " +
        settings.build +
        " mode with " +
        compiler,
      "Starting compilation for " + files.length + " files",
      "",
    ];
    files.forEach((file) => {
      lines.push("Compiling (" + getNameByPath(file) + ") - in progess");
    });
    lines.push("");
    showInterface(lines);
    await Promise.all(
      files.map(async (file, index) => {
        const res = await this.compile(settings, file, origin, compiler);

        if (res.code !== 0) {
          msg.push([res.msg, getNameByPath(file)]);
          if (settings.showSteps) {
            lines[index + 5] =
              "Compiling (" +
              getNameByPath(file) +
              ") - error       ::    " +
              res.cmd;
          } else {
            lines[index + 5] =
              "Compiling (" + getNameByPath(file) + ") - error";
          }
        } else {
          filesToUpdate.push([file, origin]);
          if (settings.showSteps) {
            lines[index + 5] =
              "Compiling (" +
              getNameByPath(file) +
              ") - done       ::    " +
              res.cmd;
          } else {
            lines[index + 5] = "Compiling (" + getNameByPath(file) + ") - done";
          }
        }

        showInterface(lines);
      })
    );

    if (msg.length > 0) {
      out.appendLine("");
      out.appendLine("");
      out.appendLine(
        msg.length === 1
          ? msg.length + " error found"
          : msg.length + " errors found"
      );
      out.appendLine("");
      for (let i = 0; i < msg.length; i++) {
        out.appendLine("FILE : " + msg[i][1].toUpperCase());
        out.appendLine(msg[i]);
        out.appendLine("");
        out.appendLine("");
      }
      return 1;
    } else {
      return 0;
    }
  }

  async compile(settings, file, origin, compiler) {
    const { version, includes, preprocessors, build } = setupSettings(
      settings,
      origin
    );
    const optimization =
      build.toUpperCase() === "DEBUG" ? "-O0 -g" : "-O3 -DNDEBUG";

    const fileName = getNameByPath(file);
    const command = `${compiler} ${optimization} ${version} ${preprocessors} ${includes} -c ${file} -o ${origin}/build/obj/${fileName}.o`;
    const response = await executeCommand(command);
    origin.replace("\\", "/");
    if (response.res !== 0) {
      return { code: 1, msg: response.msg, cmd: command };
    } else {
      return { code: 0, msg: "", cmd: command };
    }
  }

  async link(settings, origin, compiler) {
    const { name, app_type, version, dependencies, librarys } = setupSettings(
      settings,
      origin
    );

    // origin.replace("\\", "/");
    var command = "";
    if (app_type.toUpperCase() === "EXE") {
      command = `${compiler} ${version} ${origin}/build/obj/*.o -o ${origin}/build/out/${name} ${dependencies} ${librarys}`;
    } else if (app_type.toUpperCase() === "DLL") {
      command = `${compiler} ${version} -shared -o ${origin}/build/out/${name}.dll ${origin}/build/obj/*.o -Wl,--out-implib,${origin}/build/out/lib${name}.a ${dependencies} ${librarys}`;
    } else if (app_type.toUpperCase() === "SLIB") {
      command = `ar rcs ${origin}/build/out/lib${name}.a ${origin}/build/obj/*.o`;
    }
    const response = await executeCommand(command);

    if (response.res !== 0) {
      return { code: 1, msg: response.msg, cmd: command };
    } else {
      return { code: 0, msg: "", cmd: command };
    }
  }
}
const setupSettings = (settings, origin) => {
  const version =
    settings.cpp_version === "auto" ? "" : "--std=c++" + settings.cpp_version;
  var app_type = settings.application_type;
  var name = settings.name;
  var includes = "";
  var dependencies = "";
  var librarys = "";
  var preprocessors = "";
  var build = settings.build;
  settings.include.forEach((inc) => {
    if (inc !== "exemple") includes += `-I${path.join(origin, inc)} `;
  });
  settings.library_directory.forEach((dep) => {
    if (dep !== "exemple") dependencies += `-L${path.join(origin, dep)} `;
  });
  settings.library.forEach((lib) => {
    if (lib !== "exemple") librarys += `-l${lib} `;
  });
  settings.preprocessor.forEach((pre) => {
    if (pre !== "exemple") preprocessors += `-D${pre} `;
  });

  return {
    name: name,
    app_type: app_type,
    version: version,
    includes: includes,
    dependencies: dependencies,
    librarys: librarys,
    preprocessors: preprocessors,
    build: build,
  };
};

const compileFiles = async (files, settings, history, compiler, origin) => {
  if (
    settings.application_type.toUpperCase() !== "EXE" &&
    settings.application_type.toUpperCase() !== "DLL" &&
    settings.application_type.toUpperCase() !== "SLIB"
  ) {
    vscode.window.showErrorMessage(
      `This application type (${settings.application_type}) is not supported`
    );
    return 1;
  }

  if (compiler === "clang" || compiler === "clang++") {
    if (settings.application_type.toUpperCase() === "DLL") {
      vscode.window.showErrorMessage(
        `DLL application type is only supported with g++. Please switch compiler to continue!`
      );
      return 1;
    }
  }
  const files_ = filterFiles(settings, history, files, origin);
  if (files_.length === 0) {
    vscode.window.showWarningMessage(
      "There are no files ending in '.cpp' or '.c' to compile"
    );
    return 1;
  }
  const projectName = getNameByPath(origin).toUpperCase();
  if (files_.length === 0) {
    out.appendLine(
      "All files in " +
        projectName +
        " are up to date. Use 'CPP: Recompile project' to recompile the whole project"
    );
    return 0;
  }
  const start = new Date();

  const comp = new COMPILER();
  const res1 = await comp.run(settings, files_, origin, compiler);
  if (res1 !== 0) {
    out.appendLine("Compilation failed. Aborting linking.");
    return 1;
  }
  if (settings.showSteps) {
    out.append("Starting linking     ::    ");
  } else {
    out.appendLine("Starting linking");
  }
  const res2 = await comp.link(settings, origin, compiler);
  if (settings.showSteps) {
    out.appendLine(res2.cmd);
  }
  if (res2.code !== 0) {
    out.appendLine("Linking failed.");
    out.appendLine(res2.msg);
    return 1;
  }
  const end = new Date();
  out.appendLine(
    "Successfully built the project in " +
      Math.abs(end - start) +
      " ms . Check 'build/out'"
  );

  filesToUpdate.forEach((update) => {
    updatehistory(update[0], update[1]);
  });

  return 0;
};

const filterFiles = (settings, history, files, origin) => {
  const ignores = [];

  const findFiles = (origin) => {
    const stat = fs.statSync(origin);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(origin);
      files.forEach((file) => {
        const file_ = path.join(origin, file);
        const stat_ = fs.statSync(file_);

        if (stat_.isDirectory()) {
          findFiles(file_);
        } else {
          if (file.endsWith("cpp") || file.endsWith("c")) {
            ignores.push(file_);
          }
        }
      });
    } else {
      ignores.push(origin);
    }
  };
  settings.ignore.forEach((ig) => {
    if (ig !== "exemple") {
      findFiles(path.join(origin, ig));
    }
  });

  const objFiles = fs.readdirSync(path.join(origin, "build/obj"));
  for (let i = 0; i < objFiles.length; i++) {
    const objName = objFiles[i];
    var found = false;
    for (let b = 0; b < files.length; b++) {
      const fileName = getNameByPath(files[b]);
      if (objName === fileName + ".o" && !ignores.includes(files[b])) {
        found = true;
        break;
      }
    }

    if (!found) {
      fs.unlinkSync(path.join(origin, "build/obj/" + objFiles[i]), (err) => {
        console.log(err);
      });
    }
  }

  const his = history ? history : {};
  var finalFiles = [];

  const filterByTime = () => {
    for (let i = 0; i < files.length; i++) {
      var found = false;
      for (const [key, value] of Object.entries(his)) {
        if (files[i] === key) {
          const mTime = fs.statSync(files[i]).mtime;

          if (mTime > value.time && !ignores.includes(files[i])) {
            finalFiles.push(files[i]);
          } else {
            const hFiles = value.files;
            for (let i = 0; i < hFiles.length; i++) {
              const hmTime = fs.statSync(hFiles[i].file).mtime;

              if (hmTime > hFiles[i].time && !ignores.includes(files[i])) {
                finalFiles.push(files[i]);
                break;
              }
            }
          }
          found = true;
          break;
        }
      }

      if (!found && !ignores.includes(files[i])) {
        finalFiles.push(files[i]);
      }
    }
  };
  if (his.build) {
    if (his.build !== settings.build) {
      modifyFile(
        "build",
        settings.build,
        path.join(origin, "build/config/history.yml")
      );
      files.forEach((file) => {
        if (!ignores.includes(file)) {
          finalFiles.push(file);
          updatehistory(file, origin);
        }
      });
    } else {
      filterByTime();
    }
  } else {
    modifyFile(
      "build",
      settings.build,
      path.join(origin, "build/config/history.yml")
    );
    files.forEach((file) => {
      if (!ignores.includes(file)) {
        finalFiles.push(file);
        updatehistory(file, origin);
      }
    });
  }
  return finalFiles;
};

const updatehistory = (file, origin) => {
  const data = fs.readFileSync(file, "utf-8");
  const currTime = new Date();
  // var mTime = fs.statSync(files[i]).mtime;
  var hFiles = [];

  data.split(/\r?\n/).forEach((line) => {
    if (line.includes("#include")) {
      var fileRootDir = "";
      var splitPath = [];
      if (file.includes("\\")) {
        splitPath = file.split("\\");
      } else if (file.includes("/")) {
        splitPath = file.split("/");
      }
      splitPath.forEach((word, index) => {
        if (index !== splitPath.length - 1) {
          fileRootDir += word + "/";
        }
      });

      var hname = "";

      if (line.includes('"')) {
        hname = line.split('"')[1].split('"')[0];
      } else if (line.includes("<")) {
        hname = line.split("<")[1].split(">")[0];
      }

      const hpath = path.join(fileRootDir, hname);

      if (fs.existsSync(hpath)) {
        const hmTime = fs.statSync(hpath).mtime;
        hFiles.push({ file: hpath, time: hmTime });
      }
    }
  });

  const save = { time: currTime, files: hFiles };
  modifyFile(file, save, path.join(origin, "build/config/history.yml"));
};

module.exports = { compileFiles };
