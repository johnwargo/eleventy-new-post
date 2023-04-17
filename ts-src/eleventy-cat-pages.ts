#!/usr/bin/env node

/** 
 * Eleventy Category File Generator
 * by John M. Wargo (https://johnwargo.com)
 * Created March 20, 2023
 */

// TODO: Write all log output to a file

// node modules
import fs from 'fs-extra';
import path from 'path';

// Third-party modules
import boxen from 'boxen';
import YAML from 'yaml'
import yesno from 'yesno';
//@ts-ignore
import logger from 'cli-logger';

var log = logger();

// project modules
import { CategoryRecord, ConfigObject, ConfigValidation, ProcessResult } from './types';

const APP_NAME = 'Eleventy Category Files Generator';
const APP_AUTHOR = 'by John M. Wargo (https://johnwargo.com)';
const APP_CONFIG_FILE = '11ty-cat-pages.json';
const DATA_FILE = 'category-meta.json';
const ELEVENTY_FILES = ['.eleventy.js', 'eleventy.config.js'];
const TEMPLATE_FILE = '11ty-cat-pages.liquid';
const UNCATEGORIZED_STRING = 'Uncategorized';
// get CR and/or LF, accommodates DOS and Unix file formats
const YAML_PATTERN = /---[\r\n].*?[\r\n]---/s
// https://stackoverflow.com/questions/75845110/javascript-regex-to-replace-yaml-frontmatter/75845227#75845227

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
  if (a.category < b.category) {
    return -1;
  }
  if (a.category > b.category) {
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
  log.info('Building file list...');
  log.debug(`filePath: ${filePath}`);
  return getAllFiles(filePath, []);
}

function buildCategoryList(
  categories: CategoryRecord[],
  fileList: String[],
  debugMode: boolean
): CategoryRecord[] {

  if (debugMode) console.log();
  log.info('Building category list...');
  for (var fileName of fileList) {
    log.debug(`Parsing ${fileName}`);

    if (path.extname(fileName.toString().toLocaleLowerCase()) !== '.json') {
      // Read the post file
      var postFile = fs.readFileSync(fileName.toString(), 'utf8');
      // Get the first YAML block from the file
      var YAMLDoc: any[] = YAML.parseAllDocuments(postFile, { logLevel: 'silent' });
      var content = YAMLDoc[0].toJSON();
      if (debugMode) console.dir(content);
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
        var index = categories.findIndex((item) => item.category === category);
        if (index < 0) {
          log.info(`Found category: ${category}`);
          // add the category to the list
          categories.push({ category: category, count: 1, description: '' });
        } else {
          // increment the count for the category
          categories[index].count++;
        }
      }
    } else {
      log.info(`Skipping ${fileName}`);
    }
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
    categoryFolder: findFilePath('category', theFolders),
    dataFileName: DATA_FILE,
    dataFolder: findFilePath('_data', theFolders),
    postsFolder: findFilePath('posts', theFolders),
    templateFileName: TEMPLATE_FILE
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
  await yesno({
    question: '\nCreate configuration file? Enter yes or no:',
    defaultValue: false,
    yesValues: ['Yes'],
    noValues: ['No']
  }).then((confirmExport: boolean) => {
    if (confirmExport) {

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
  });
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

// we'll create this file when we write it
// { filePath: configObject.dataFileName, isFolder: false },
const validations: ConfigValidation[] = [
  { filePath: configObject.categoryFolder, isFolder: true },
  { filePath: configObject.dataFolder, isFolder: true },
  { filePath: configObject.postsFolder, isFolder: true },
  { filePath: configObject.templateFileName, isFolder: false }
];

validateConfig(validations)
  .then((res: ProcessResult) => {
    if (res.result) {

      // read the template file
      log.info(`Reading template file ${configObject.templateFileName}`);
      let templateFile = fs.readFileSync(configObject.templateFileName, 'utf8');
      // get the YAML frontmatter
      let templateDoc = YAML.parseAllDocuments(templateFile, { logLevel: 'silent' });
      // convert the YAML frontmatter to a JSON object
      let frontmatter = JSON.parse(JSON.stringify(templateDoc))[0];
      // at this point we have the frontmatter as a JSON object
      if (debugMode) console.dir(frontmatter);
      if (!frontmatter.pagination) {
        log.error('The template file does not contain the pagination frontmatter');
        process.exit(1);
      }

      // get the file extension for the template file, we'll use it later
      templateExtension = path.extname(configObject.templateFileName);

      let categories: CategoryRecord[] = [];
      // Read the existing categories file
      let categoriesFile = path.join(process.cwd(), configObject.dataFolder, configObject.dataFileName);
      if (fs.existsSync(categoriesFile)) {
        log.info(`Reading existing categories file ${categoriesFile}`);
        let categoryData = fs.readFileSync(categoriesFile, 'utf8');
        categories = JSON.parse(categoryData);
        // zero out all of the categories
        if (categories.length > 0) categories.forEach((item) => item.count = 0);
        if (debugMode) console.table(categories);
      } else {
        log.info('Category data file not found, will create a new one');
      }

      fileList = getFileList(configObject.postsFolder, debugMode);
      if (fileList.length < 1) {
        log.error('\nNo Post files found in the project, exiting');
        process.exit(0);
      }

      log.info(`Located ${fileList.length} files`);
      if (debugMode) console.dir(fileList);

      // build the categories list
      categories = buildCategoryList(categories, fileList, debugMode);
      // do we have any categories?
      if (categories.length > 0) {
        // Delete any with a count of 0
        log.info('Deleting unused categories (from previous runs)');
        categories = categories.filter((item) => item.count > 0);
      }
      log.info(`Identified ${categories.length} categories`);
      categories = categories.sort(compareFunction);
      if (debugMode) console.table(categories);

      log.info(`Writing categories list to ${categoriesFile}`);
      try {
        fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2), 'utf8');
      } catch (err) {
        console.log('Error writing file');
        console.error(err)
        process.exit(1);
      }

      // empty the categories folder, just in case there are old categories there
      const categoriesFolder = path.join(process.cwd(), configObject.categoryFolder);
      log.debug(`Emptying categories folder: ${categoriesFolder}`);
      fs.emptyDirSync(categoriesFolder);

      // create separate pages for each category
      categories.forEach(function (item) {
        // why would this ever happen?
        if (item.category === "")
          return;

        log.debug(`\nProcessing category: ${item.category}`);
        let pos1 = templateFile.search(YAML_PATTERN);
        if (pos1 > -1) {
          // We have a match for the YAML frontmatter (which makes sense)
          // replace the category field in the frontmatter
          frontmatter.category = item.category;
          if (item.category == UNCATEGORIZED_STRING) {
            // deal with uncategorized posts differently, categories field is blank
            frontmatter.pagination.before = `function(paginationData, fullData){ return paginationData.filter((item) => item.data.categories.length == 0);}`
          } else {
            frontmatter.pagination.before = `function(paginationData, fullData){ return paginationData.filter((item) => item.data.categories.includes('${item.category}'));}`
          }

          // convert the frontmatter to JSON format
          let tmpFrontmatter: string = JSON.stringify(frontmatter, null, 2);
          // Remove quotes around the `before` callback function
          tmpFrontmatter = tmpFrontmatter.replace(
            `"${frontmatter.pagination.before}"`,
            frontmatter.pagination.before
          );
          // add the JSON frontmatter delimiters
          tmpFrontmatter = `---js\n${tmpFrontmatter}\n---`;
          // replace the content in the file 
          let newFrontmatter = templateFile.replace(YAML_PATTERN, tmpFrontmatter);
          // build the output file name
          let outputFileName: string = path.join(
            categoriesFolder,
            item.category.toLowerCase().replaceAll(' ', '-') + templateExtension
          );
          log.info(`Writing category page: ${outputFileName}`);
          fs.writeFileSync(outputFileName, newFrontmatter);
        } else {
          log.error('Unable to match frontmatter in template file');
          process.exit(1);
        }
      });
    } else {
      log.error(res.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    log.error(err);
    process.exit(1);
  });
