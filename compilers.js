const { executeCommand } = require("./utils.js");
const { out } = require("./channels.js");
const path = require("path");
const fs = require("fs");
const { modifyFile } = require("./ymlFilesManager");
const vscode = require("vscode");

class GCC {
  async run(settings, files, origin) {
    for (let i = 0; i < files.length; i++) {
      out.appendLine("Compiling " + files[i].split("\\").at(-1));

      const res = await this.compile(settings, files[i], origin);

      if (res !== 0) {
        return res;
      }
    }

    return 0;
  }

  async compile(settings, file, origin) {
    const { version, includes, preprocessors, build } = setupSettings(
      settings,
      origin
    );
    const optimization =
      build.toUpperCase() === "DEBUG" ? "-O0 -g" : "-O3 -DNDEBUG";

    const splitPath = file.split("\\");
    const fileName = splitPath.at(-1);
    const response = await executeCommand(
      `g++ ${optimization} ${version} ${preprocessors} ${includes} -c ${file} -o ${origin}/build/obj/${fileName}.o`
    );
    origin.replace("\\", "/");
    if (response.res !== 0) {
      out.appendLine(response.msg);
      return 1;
    } else {
      return 0;
    }
  }

  async link(settings, origin) {
    const { name, app_type, version, dependencies, librarys } = setupSettings(
      settings,
      origin
    );

    origin.replace("\\", "/");
    var command = "";
    if (app_type.toUpperCase() === "EXE") {
      command = `g++ ${version} ${origin}/build/obj/*.o -o ${origin}/build/out/${name} ${dependencies} ${librarys}`;
    } else if (app_type.toUpperCase() === "DLL") {
      command = `g++ ${version} -shared -o ${origin}/build/out/${name}.dll ${origin}/build/obj/*.o -Wl,--out-implib,${origin}/build/out/lib${name}.a ${dependencies} ${librarys}`;
    } else if (app_type.toUpperCase() === "SLIB") {
      command = `ar rcs ${origin}/build/out/lib${name}.a ${origin}/build/obj/*.o ${dependencies} ${librarys}`;
    }
    const response = await executeCommand(command);

    if (response.res !== 0) {
      out.appendLine(response.msg);
      return 1;
    } else {
      return 0;
    }
  }
}

class CLANG {
  async run(settings, files, origin) {
    for (let i = 0; i < files.length; i++) {
      out.appendLine("Compiling " + files[i].split("\\").at(-1));

      const res = await this.compile(settings, files[i], origin);

      if (res !== 0) {
        return res;
      }
    }

    return 0;
  }

  async compile(settings, file, origin) {
    const { version, includes, preprocessors, build } = setupSettings(
      settings,
      origin
    );
    const optimization =
      build.toUpperCase() === "DEBUG" ? "-00 -g" : "-02 -s -DNDEBUG";

    const splitPath = file.split("\\");
    const fileName = splitPath.at(-1);
    const response = await executeCommand(
      `clang++ ${optimization} ${version} ${preprocessors} ${includes} -c ${file} -o ${origin}/build/obj/${fileName}.o`
    );
    origin.replace("\\", "/");
    if (response.res !== 0) {
      out.appendLine(response.msg);
      return 1;
    } else {
      return 0;
    }
  }

  async link(settings, origin) {
    const { name, app_type, version, dependencies, librarys } = setupSettings(
      settings,
      origin
    );

    // result = os.system(f'cmd /c"{compiler} {build_parameter} -g --std=c++{cpp_version} bin\\obj\\{DirPath}\\*.o -o bin\\build\\{app_name} {libs} {dependencies}"')
    origin.replace("\\", "/");
    var command = "";
    if (app_type.toUpperCase() === "EXE") {
      command = `clang++ ${version} ${origin}/build/obj/*.o -o ${origin}/build/out/${name} ${dependencies} ${librarys}`;
    } else if (app_type.toUpperCase() === "DLL") {
      command = `clang++ ${version} -shared -o ${origin}/build/out/${name}.dll ${origin}/build/obj/*.o -Wl,--out-implib,${origin}/build/out/lib${name}.a ${dependencies} ${librarys}`;
    } else if (app_type.toUpperCase() === "SLIB") {
      command = `ar rcs ${origin}/build/out/lib${name}.a ${origin}/build/obj/*.o ${dependencies} ${librarys}`;
    }

    const response = await executeCommand(command);

    if (response.res !== 0) {
      out.appendLine(response.msg);
      return 1;
    } else {
      return 0;
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
    compiler === "clang++"
  ) {
    vscode.window.showErrorMessage(
      `This application type (${settings.application_type}) is not yet supported`
    );
    return;
  }
  const files_ = filterFiles(settings, history, files, origin);
  const projectName = origin.split("\\").at(-1).toUpperCase();
  if (files_.length === 0) {
    out.appendLine(
      "All files in " +
        projectName +
        " are up to date. Use 'CPP: Recompile project' to recompile the whole project"
    );
    return 0;
  }
  if (compiler === "g++") {
    const gcc = new GCC();
    out.appendLine("");
    out.appendLine("");
    out.appendLine("Building " + projectName + " project");
    out.appendLine("Starting compilation using g++");
    const res1 = await gcc.run(settings, files_, origin);
    if (res1 !== 0) {
      out.appendLine("Compilation failed. Aborting linking.");
      return 1;
    }
    out.appendLine("Starting linking using g++");
    const res2 = await gcc.link(settings, origin);
    if (res2 !== 0) {
      out.appendLine("Linking failed.");
      return 1;
    }
    out.appendLine("Successfully built the project. Check 'build/out'");
  } else if (compiler === "clang++") {
    const clang = new CLANG();
    out.appendLine("");
    out.appendLine("");
    out.appendLine("Building " + projectName + " project");
    out.appendLine("Starting compilation using clang++");
    const res1 = await clang.run(settings, files_, origin);
    if (res1 !== 0) {
      out.appendLine("Compilation failed. Aborting linking.");
      return 1;
    }
    out.appendLine("Starting linking using clang++");
    const res2 = await clang.link(settings, origin);
    if (res2 !== 0) {
      out.appendLine("Linking failed.");
      return 1;
    }
    out.appendLine("Successfully built the project. Check 'build/out'");
  }

  files_.forEach((file) => {
    updatehistory(file, origin);
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
          if (file.endsWith("cpp")) {
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
      const fileName = files[b].split("\\").at(-1);
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
    if (line.includes("#include") && line.includes('"')) {
      var fileRootDir = "";
      const splitPath = file.split("\\");
      splitPath.forEach((word, index) => {
        if (index !== splitPath.length - 1) {
          fileRootDir += word + "/";
        }
      });
      const hname = line.split('"')[1].split('"')[0];

      const hpath = path.join(fileRootDir, hname);
      const hmTime = fs.statSync(hpath).mtime;

      hFiles.push({ file: hpath, time: hmTime });
    }
  });

  const save = { time: currTime, files: hFiles };
  modifyFile(file, save, path.join(origin, "build/config/history.yml"));
};

module.exports = { compileFiles };
