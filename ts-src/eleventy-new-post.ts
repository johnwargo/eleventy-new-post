#!/usr/bin/env node
/** 
 * Eleventy New Post
 * by John M. Wargo (https://johnwargo.com)
 * Created March 20, 2023
 * 
 * Copied from the 11ty-cat-pages module.
 */

// node modules
import fs from 'fs-extra';
import path from 'path';

// Third-party modules
import boxen from 'boxen';
import { execa } from 'execa';
import prompts from 'prompts';
import YAML from 'yaml'
//@ts-ignore
import logger from 'cli-logger';
var log = logger();

// ====================================
// Types
// ====================================

type ConfigObject = {
  postsFolder: string;
  templateFile: string;
  paragraphCount: number;
  useYear: boolean;
  // Added in 0.0.6
  openAfterCreate: boolean;
  editorCmd: string;
  // added 0.0.12
  promptTargetFolder: boolean;
  // added 0.0.14
  promptCategory: boolean;
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

type PromptSelection = {
  title: string;
  value: string;
}

// ====================================
// Constants and Variables
// ====================================

const APP_NAME = '11ty New Post';
const APP_AUTHOR = 'by John M. Wargo (https://johnwargo.com)';
const APP_CONFIG_FILE = '11ty-np.json';
const DEFAULT_PARAGRAPH_COUNT = 4;
const ELEVENTY_FILES = ['.eleventy.js', 'eleventy.config.js'];
const TEMPLATE_FILE = '11ty-np.md';
const UNCATEGORIZED_STRING = 'Uncategorized';
const YAML_PATTERN = /(?<=---[\r\n]).*?(?=[\r\n]---)/s

var categories: Choice[] = [];
var hasBlankCategory: boolean = false;
var fileList: String[] = [];
var templateExtension: string;

// ====================================
// Functions
// ====================================

function zeroPad(tmpVal: number, numChars: number = 2): string {
  return tmpVal.toString().padStart(numChars, '0');
}

function checkEleventyProject(): boolean {
  log.debug('Validating project folder');
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
  if (!configObject.paragraphCount || (configObject.paragraphCount < 1 && configObject.paragraphCount > 101)) {
    processResult.result = false;
    processResult.message += `\nThe 'paragraphCount' value must be greater than 0 and less than 101.`;
  }
  if (configObject.openAfterCreate && configObject.editorCmd.length < 1) {
    processResult.result = false;
    processResult.message += '\neditorCmd must contain a value when openAfterCreate is true.'
  }
  return processResult;
}

function getAllFolders(sourcePath: string): PromptSelection[] {
  var folders: PromptSelection[] = [];
  // add the source folder to the top of the list
  folders.push({ title: path.normalize(sourcePath), value: '.' });

  var allFiles = fs.readdirSync(sourcePath);
  allFiles.forEach(file => {
    if (fs.statSync(path.join(sourcePath, file)).isDirectory()) {
      folders.push({ title: path.join(sourcePath, file), value: file });
    }
  });
  return folders;
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
      // Does the post have a category?
      var categoriesString: string = (content.categories) ? content.categories.toString() : '';
      if (categoriesString.length < 1) {
        categoriesString = UNCATEGORIZED_STRING;
        hasBlankCategory = true;
      }
      // split the category list into an array, just in case
      var catArray = categoriesString.split(',');
      // loop through the array
      for (var cat of catArray) {
        // Remove leading and trailing spaces
        var category = cat.trim();
        // Does the category already exist in the list?
        var idx = categories.findIndex((item) => item.title === category);
        if (idx < 0) {
          log.debug(`Found category: ${category}`);
          if (category === UNCATEGORIZED_STRING) {
            categories.push({ title: UNCATEGORIZED_STRING, value: '' });
          } else {
            categories.push({ title: category, value: category });
          }
        }
      }
    } else {
      log.debug(`Skipping ${fileName}`);
    }
  }
  // Add an uncategorized option if needed
  if (!hasBlankCategory) {
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
    editorCmd: 'code',
    openAfterCreate: false,
    paragraphCount: DEFAULT_PARAGRAPH_COUNT,
    postsFolder: findFilePath('posts', theFolders),
    promptCategory: true,
    promptTargetFolder: false,
    templateFile: TEMPLATE_FILE,
    useYear: false,
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
log.debug('Locating configuration file');
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
    // do this so on windows it won't have double backslashes
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

// do we have a configuration file? We should, we checked earlier
log.debug('Configuration file located, validating');
const configFilePath = path.join(process.cwd(), APP_CONFIG_FILE);
if (!fs.existsSync(configFilePath)) {
  log.error(`Unable to locate the configuration file '${APP_CONFIG_FILE}'`);
  process.exit(1);
}
// Read the config file
let configData = fs.readFileSync(configFilePath, 'utf8');
const configObject: ConfigObject = JSON.parse(configData);
const validations: ConfigValidation[] = [
  { filePath: configObject.postsFolder, isFolder: true },
  { filePath: configObject.templateFile, isFolder: false }
];
// Make sure the configuration file is valid
var res: ProcessResult = await validateConfig(validations);
if (!res.result) {
  log.error(res.message);
  process.exit(1);
}

if (configObject.useYear && configObject.promptTargetFolder) {
  log.error('\nConfiguration error: Settings `useYear` and `promptTargetFolder` cannot be enabled simultaneously, exiting');
  process.exit(1);
}

// ========================================================================
// get to work...
// ========================================================================
// get the file extension for the template file, we'll use it later
templateExtension = path.extname(configObject.templateFile);
// read the template file
log.debug(`Reading template file ${configObject.templateFile}`);
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
// ========================================================================
// at this point we have the whole template in the `templateFile` variable
// and the front matter in `templateFrontmatter`
// ========================================================================

// The questions array with the title prompt only, 
const questions: any[] = [
  {
    type: 'text',
    name: 'postTitle',
    message: 'Enter a title for the post:'
  }];

if (configObject.promptCategory) {
  fileList = getFileList(configObject.postsFolder, debugMode);
  log.debug(`Located ${fileList.length} post files`);
  if (fileList.length > 0) {
    if (debugMode) console.dir(fileList);
    // build the categories list
    categories = buildCategoryList(fileList, debugMode);
    // do we have any categories?
    if (categories.length > 0) log.debug(`Found ${categories.length} categories`);
    categories = categories.sort(compareFunction);
    if (debugMode) console.table(categories);
    // If we have categories to pick from, then add the category prompt to the questions array
    if (categories.length > 0) questions.push({
      type: 'multiselect',
      name: 'postCategories',
      message: 'Select one or more categories from the list below:',
      choices: categories,
      initial: 0
    });
  }
}

if (configObject.promptTargetFolder) {
  // build the list of folders to prompt for based on the posts folder
  var targetFolders: PromptSelection[] = getAllFolders(configObject.postsFolder);
  if (debugMode) console.dir(targetFolders);

  if (targetFolders.length < 1) {
    log.error(`No subfolders found in ${configObject.postsFolder}, exiting.`);
    process.exit(1);
  }
  // add the folder prompt to the questions array
  questions.push({
    type: 'select',
    name: 'targetFolder',
    message: 'Select the target folder for the new post:',
    choices: targetFolders,
    initial: 0
  });
}

console.log();  // throw in a blank line on the console
let response = await prompts(questions);

// Did the user cancel?
if (!response.postTitle || (configObject.promptTargetFolder && !response.targetFolder)) {
  log.info('\nCancelled by user');
  process.exit(0);
}

let postTitle: string = response.postTitle;
log.debug(`\nTitle: ${postTitle}`);

// start with an empty array, assumes no selected category
let catList: string[] = [];
if (configObject.promptCategory) {
  // do we have any categories?
  if (response.postCategories && response.postCategories.length > 0) {
    // did the user select the uncategorized category?
    if (!response.postCategories.includes('')) {
      // no, so append the selected categories to the catList array
      catList = catList.concat(response.postCategories);
    } else {
      // let the user know we're ignoring the other categories
      log.info('\nUncategorized selected, ignoring other selected categories');
    }
  }
  if (debugMode) console.dir(catList);
}

// build the target file name
let outputFile = path.join(process.cwd(), configObject.postsFolder);
if (configObject.useYear) {
  outputFile = path.join(outputFile, new Date().getFullYear().toString());
}
// if we have a target folder, add it to the output file path
if (configObject.promptTargetFolder) {
  outputFile = path.join(outputFile, response.targetFolder);
}

console.log();

// v0.0.11 - Create the target folder if it doesn't exist
// this is for using year folder after the beginning of a year
if (!fs.existsSync(outputFile)) {
  log.info(`Creating target folder: "${outputFile}"`);
  fs.mkdirSync(outputFile, { recursive: true });
}

var fileName = postTitle.toLowerCase().replaceAll(' ', '-');
fileName = fileName.replaceAll('?', '');
fileName = fileName.replaceAll(':', '-');
fileName = fileName.replaceAll('---', '-');
fileName = fileName.replaceAll('--', '-');
// add the file extension to the newly formed file name
fileName += templateExtension;

outputFile = path.join(outputFile, fileName);
log.debug(`Target file: ${outputFile}`);
if (fs.existsSync(outputFile)) {
  log.info(`File ${outputFile} already exists, exiting`);
  process.exit(1);
}

// update the front matter with the post title and category
let tmpDate = new Date();
templateFrontmatter.date = `${tmpDate.getFullYear()}-${zeroPad(tmpDate.getMonth() + 1)}-${zeroPad(tmpDate.getDate())}`;
templateFrontmatter.title = postTitle;

if (configObject.promptCategory) {
  // add the category list to the document
  templateFrontmatter.categories = catList;
}

// ensure all front matter properties are populated at least with an empty string
for (var key in templateFrontmatter) {
  templateFrontmatter[key] = (templateFrontmatter[key] !== null) && (templateFrontmatter[key] != "") ? templateFrontmatter[key] : '';
}

// Get the front matter in string format
let tmpFrontmatter = YAML.stringify(templateFrontmatter, { logLevel: 'silent' });
// Now, since we may have blank properties, we need to remove the empty quotes
tmpFrontmatter = tmpFrontmatter.replaceAll(': ""', ': ');
// remove the extra carriage return from the end of the frontmatter
tmpFrontmatter = tmpFrontmatter.replace(/\n$/, '');
// make a copy of the template file
let newFile = templateFile.slice();
// replace the YAML frontmatter in the copied file
newFile = newFile.replace(YAML_PATTERN, tmpFrontmatter);
if (doPopulate) {
  log.info('Getting bacon ipsum text (this may take a few seconds)...');
  let fetchURL = `https://baconipsum.com/api/?type=all-meat&paras=${configObject.paragraphCount}&start-with-lorem=1`;
  log.debug(`fetchURL: ${fetchURL}`);
  let response: Response = await fetch(fetchURL);
  let fillerText = await response.json();
  for (const item of fillerText) newFile += item + '\n\n';
}
// write the new file
log.info(`Writing content to ${outputFile}`);
fs.writeFileSync(outputFile, newFile, 'utf8');
// then launch it in an editor if configured to do so
if (configObject.openAfterCreate) {
  var localFile = '.' + path.sep + path.relative(process.cwd(), outputFile);
  log.info(`Opening ${localFile} in ${configObject.editorCmd}`);
  try {
    await execa(configObject.editorCmd, [localFile]);
  } catch (err) {
    log.error(err);
    process.exit(1);
  }
}
