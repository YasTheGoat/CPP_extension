const yml = require("js-yaml");
const fs = require("fs");

const SettingsTemplate = `name: "app"       #Do not put any space in the name
application_type: "exe"                     # exe, dll, or slib
cpp_version: "auto" 
build: "Debug"                              #Debug or Release
showSteps: true
showConsole: true                           # This parameter allows you to specify wheither a console should appear alongside your application or not
include:
    - exemple
library_directory:
    - exemple
library:
    - exemple
preprocessor:
    - exemple
ressources:                                # The ressources are folders or files that will be copied into the out folder when the compilation is over
    - exemple        
ignore:
    - exemple     

# IMPORTANT NOTICE 1: always put a space between "-" and the 
#                     variable after. Also put a TAB space before

# IMPORTANT NOTICE 2: when adding path to your includes, dependecies, librarys or ressources, 
#                     The path has to be relative to the workspace(poroject) root
`;

const readFile = (path) => {
  const doc = yml.load(fs.readFileSync(path));
  return doc;
};

const modifyFile = (field, data, path) => {
  const doc = yml.load(fs.readFileSync(path));
  const doc_ = doc ? doc : {};
  doc_[field] = data;
  fs.writeFileSync(path, yml.dump(doc_), (err) => {
    console.log(err);
  });
};

module.exports = { SettingsTemplate, readFile, modifyFile };
