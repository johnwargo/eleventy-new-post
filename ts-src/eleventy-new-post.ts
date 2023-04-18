#!/usr/bin/env node

/** 
 * Eleventy New Post
 * by John M. Wargo (https://johnwargo.com)
 * Created March 20, 2023
 * 
 * Copied from the 11ty-cat-pages module
 */

// TODO: Remove empty quotes from front matter for empty categories

// node modules
import fs from 'fs-extra';
import path from 'path';

// Third-party modules
import boxen from 'boxen';
import prompts from 'prompts';
import YAML from 'yaml'
//@ts-ignore
import logger from 'cli-logger';
var log = logger();

type ConfigObject = {
  postsFolder: string;
  templateFile: string;
  useYear: boolean;
}

type ConfigValidation = {
  filePath: string;
  isFolder: boolean;
}

type ProcessResult = {
  result: boolean;
  message: string;
}

type Choice = {
  title: string;
  value: string;
}

const APP_NAME = 'Eleventy Category Files Generator';
const APP_AUTHOR = 'by John M. Wargo (https://johnwargo.com)';
const APP_CONFIG_FILE = '11ty-np.json';
const ELEVENTY_FILES = ['.eleventy.js', 'eleventy.config.js'];
const TEMPLATE_FILE = '11ty-np.md';
const UNCATEGORIZED_STRING = 'Uncategorized';
const YAML_PATTERN = /(?<=---[\r\n]).*?(?=[\r\n]---)/s

var fileList: String[] = [];
var templateExtension: string;

// ====================================
// Functions
// ====================================

function checkEleventyProject(): boolean {
  log.info('Validating project folder');
  let result = false;
  ELEVENTY_FILES.forEach((file) => {
    let tmpFile = path.join(process.cwd(), file);
    if (fs.existsSync(tmpFile)) {
      result = true;
    }
  });
  return result;
}

function compareFunction(a: any, b: any) {
  if (a.title < b.title) {
    return -1;
  }
  if (a.title > b.title) {
    return 1;
  }
  return 0;
}

async function validateConfig(validations: ConfigValidation[]): Promise<ProcessResult> {

  var processResult: ProcessResult;

  processResult = {
    result: true, message: 'Configuration file errors:\n'
  };

  for (var validation of validations) {
    log.debug(`Validating '${validation.filePath}'`);
    if (validation.isFolder) {
      if (!directoryExists(validation.filePath)) {
        processResult.result = false;
        processResult.message += `\nThe '${validation.filePath}' folder is required, but does not exist.`;
      }
    } else {
      if (!fs.existsSync(validation.filePath)) {
        processResult.result = false;
        processResult.message += `\nThe '${validation.filePath}' file is required, but does not exist.`;
      }
    }
  }
  return processResult;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[]) {
  var files = fs.readdirSync(dirPath)
  arrayOfFiles = arrayOfFiles || []
  files.forEach(function (file: string) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(process.cwd(), dirPath, file));
    }
  });
  return arrayOfFiles
}

function getFileList(filePath: string, debugMode: boolean): String[] {
  if (debugMode) console.log();
  log.debug('Building file list...');
  log.debug(`filePath: ${filePath}`);
  return getAllFiles(filePath, []);
}

function buildCategoryList(
  fileList: String[],
  debugMode: boolean
): Choice[] {
  if (debugMode) console.log();
  log.debug('Building category list...');
  let categories: Choice[] = [];
  for (var fileName of fileList) {
    log.debug(`Parsing ${fileName}`);
    if (path.extname(fileName.toString().toLocaleLowerCase()) !== '.json') {
      // Read the post file
      var postFile = fs.readFileSync(fileName.toString(), 'utf8');
      // Get the first YAML block from the file
      var YAMLDoc: any[] = YAML.parseAllDocuments(postFile, { logLevel: 'silent' });
      var content = YAMLDoc[0].toJSON();
      // if (debugMode) console.dir(content);
      // Does the post have a category?
      if (content.categories) {
        var categoriesString = content.categories.toString();
      } else {
        // handle posts that don't have a category
        categoriesString = UNCATEGORIZED_STRING;
      }
      // split the category list into an array
      var catArray = categoriesString.split(',');
      // loop through the array
      for (var cat of catArray) {
        var category = cat.trim();  // Remove leading and trailing spaces        
        // Does the category already exist in the list?
        var index = categories.findIndex((item) => item.title === category);
        if (index < 0) {
          log.debug(`Found category: ${category}`);
          // add the category to the list
          if (category === UNCATEGORIZED_STRING) {
            categories.push({ title: category, value: '' });
          } else {
            categories.push({ title: category, value: category });
          }
        }
      }
    } else {
      log.debug(`Skipping ${fileName}`);
    }
  }
  // Make sure uncategorized is in the list
  if (!categories.some(code => code.title === UNCATEGORIZED_STRING)) {
    categories.push({ title: UNCATEGORIZED_STRING, value: '' });
  }
  return categories;
}

function directoryExists(filePath: string): boolean {
  if (fs.existsSync(filePath)) {
    try {
      return fs.lstatSync(filePath).isDirectory();
    } catch (err) {
      log.error(`checkDirectory error: ${err}`);
      return false;
    }
  }
  return false;
}

function findFilePath(endPath: string, thePaths: string[]): string {
  // set the default value, the last path in the array
  let resStr = path.join(thePaths[thePaths.length - 1], endPath);
  for (var tmpPath of thePaths) {
    let destPath: string = path.join(tmpPath, endPath);
    log.debug(`Checking ${destPath}`);
    if (directoryExists(destPath)) {
      resStr = destPath;
      break;
    }
  }
  return resStr;
}

function buildConfigObject(): ConfigObject {
  const theFolders: string[] = ['.', 'src'];
  return {
    postsFolder: findFilePath('posts', theFolders),
    templateFile: TEMPLATE_FILE,
    useYear: false
  }
}

// ====================================
// Start Here!
// ====================================

console.log(boxen(APP_NAME, { padding: 1 }));
console.log('\n' + APP_AUTHOR);

// do we have command-line arguments?
const myArgs = process.argv.slice(2);
const debugMode = myArgs.includes('-d');
const doPopulate = myArgs.includes('-p');

// set the logger log level
log.level(debugMode ? log.DEBUG : log.INFO);
log.debug('Debug mode enabled\n');
log.debug(`cwd: ${process.cwd()}`);

// is it an Eleventy project?
if (!checkEleventyProject()) {
  log.error('Current folder is not an Eleventy project folder.');
  process.exit(1);
}
log.debug('Project is an Eleventy project folder');

// does the config file exist?
const configFile = path.join(process.cwd(), APP_CONFIG_FILE);
log.info('Locating configuration file');
if (!fs.existsSync(configFile)) {
  log.info(`\nConfiguration file '${APP_CONFIG_FILE}' not found`);
  log.info('Rather than using a bunch of command-line arguments, this tool uses a configuration file instead.');
  log.info('In the next step, the module will automatically create the configuration file for you.');
  log.info('Once it completes, you can edit the configuration file to change the default values and execute the command again.');

  console.log();
  let response = await prompts({
    type: 'confirm',
    name: 'continue',
    message: 'Create configuration file?',
    initial: true
  });
  if (response.continue) {
    // create the configuration file  
    let configObject = buildConfigObject();
    if (debugMode) console.dir(configObject);
    let outputStr = JSON.stringify(configObject, null, 2);
    // replace the backslashes with forward slashes
    // do this so on windows it would have double backslashes
    outputStr = outputStr.replace(/\\/g, '/');
    outputStr = outputStr.replaceAll('//', '/');
    log.info(`Writing configuration file ${APP_CONFIG_FILE}`);
    try {
      fs.writeFileSync(path.join('.', APP_CONFIG_FILE), outputStr, 'utf8');
      log.info('Output file written successfully');
      log.info('\nEdit the configuration with the correct values for this project then execute the command again.');
    } catch (err: any) {
      log.error(`Unable to write to ${APP_CONFIG_FILE}`);
      console.dir(err);
      process.exit(1);
    }
    process.exit(0);
  } else {
    log.info('Exiting...');
    process.exit(0);
  }
}

// Read the config file
log.info('Configuration file located, validating');
const configFilePath = path.join(process.cwd(), APP_CONFIG_FILE);
if (!fs.existsSync(configFilePath)) {
  log.error(`Unable to locate the configuration file '${APP_CONFIG_FILE}'`);
  process.exit(1);
}

let configData = fs.readFileSync(configFilePath, 'utf8');
const configObject: ConfigObject = JSON.parse(configData);
const validations: ConfigValidation[] = [
  { filePath: configObject.postsFolder, isFolder: true },
  { filePath: configObject.templateFile, isFolder: false }
];

validateConfig(validations)
  .then(async (res: ProcessResult) => {
    if (res.result) {
      // get the file extension for the template file, we'll use it later
      templateExtension = path.extname(configObject.templateFile);
      // read the template file
      log.info(`Reading template file ${configObject.templateFile}`);
      const templateFile = fs.readFileSync(configObject.templateFile, 'utf8');
      // get the YAML front matter
      let templateDoc = YAML.parseAllDocuments(templateFile, { logLevel: 'silent' });
      // convert the YAML front matter to a JSON object
      let templateFrontmatter = JSON.parse(JSON.stringify(templateDoc))[0];
      // at this point we have the front matter as a JSON object
      if (debugMode) console.dir(templateFrontmatter);
      if (!templateFrontmatter) {
        log.error('The template file does not contain any YAML front matter, exiting');
        process.exit(1);
      }
      // at this point we have the whole template in templateFile and the front matter in templateFrontmatter    

      fileList = getFileList(configObject.postsFolder, debugMode);
      if (fileList.length < 1) {
        log.error('\nNo Post files found in the project, exiting');
        process.exit(0);
      }
      log.debug(`Located ${fileList.length} post files`);
      if (debugMode) console.dir(fileList);

      // build the categories list
      let categories: Choice[] = buildCategoryList(fileList, debugMode);
      // do we have any categories?
      if (categories.length > 0) log.info(`Found ${categories.length} categories`);
      categories = categories.sort(compareFunction);
      if (debugMode) console.table(categories);

      // Prompt for post title and category
      const questions: any[] = [
        {
          type: 'text',
          name: 'postTitle',
          message: 'Enter a title for the post:'
        }, {
          type: 'select',
          name: 'postCategory',
          message: 'Select an article category from the list:',
          choices: categories,
          initial: 0
        }];
      console.log();
      let response = await prompts(questions);

      let postTitle: string = response.postTitle;
      log.debug(`Title: ${postTitle}`);
      let postCategory: string = response.postCategory;
      log.debug(`Selected category: ${postCategory}`);
      // update the front matter with the post title and category
      templateFrontmatter.title = postTitle;
      templateFrontmatter.category = postCategory;      

      let  newFile = templateFile.slice(); 
      console.log(newFile);

      // add the front matter to the file 
      let tmpFrontmatter = YAML.stringify(templateFrontmatter, { logLevel: 'silent' });
      // remove the extra carriage return from the end of the frontmatter
      tmpFrontmatter = tmpFrontmatter.replace(/\n$/, '');
      // replace the YAML frontmatter in the file
      newFile = newFile.replace(YAML_PATTERN, tmpFrontmatter);
      // do we need to populate the post with bacon ipsum text?
      if (doPopulate) {
        // get bacon ipsum text

        // append it to the end of the template file
        newFile += 'this is some extra text';
      }

      // build the target file name
      let outputFile = path.join(process.cwd(), configObject.postsFolder);
      if (configObject.useYear) {
        outputFile = path.join(outputFile, new Date().getFullYear().toString());
      }
      outputFile = path.join(outputFile, postTitle.toLowerCase().replaceAll(' ', '-') + templateExtension);
      log.info(`Writing changes to ${outputFile}`);      
      fs.writeFileSync(outputFile, newFile, 'utf8');
    } else {
      log.error(res.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    log.error(err);
    process.exit(1);
  });
