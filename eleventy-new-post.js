#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import boxen from 'boxen';
import { execa } from 'execa';
import prompts from 'prompts';
import YAML from 'yaml';
import logger from 'cli-logger';
var log = logger();
const APP_NAME = '11ty New Post';
const APP_AUTHOR = 'by John M. Wargo (https://johnwargo.com)';
const APP_CONFIG_FILE = '11ty-np.json';
const DEFAULT_PARAGRAPH_COUNT = 4;
const ELEVENTY_FILES = ['.eleventy.js', 'eleventy.config.js'];
const TEMPLATE_ROOT = '11ty-np';
const TEMPLATE_FILE_DEFAULT = TEMPLATE_ROOT + '.md';
const UNCATEGORIZED_STRING = 'Uncategorized';
const YAML_PATTERN = /(?<=---[\r\n]).*?(?=[\r\n]---)/s;
var categories = [];
var hasBlankCategory = false;
var templateExtension;
function zeroPad(tmpVal, numChars = 2) {
    return tmpVal.toString().padStart(numChars, '0');
}
function compareFunction(a, b) {
    if (a.title < b.title) {
        return -1;
    }
    if (a.title > b.title) {
        return 1;
    }
    return 0;
}
function checkEleventyProject() {
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
async function validateConfig(validations) {
    var processResult;
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
        }
        else {
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
        processResult.message += '\neditorCmd must contain a value when openAfterCreate is true.';
    }
    return processResult;
}
function getAllFolders(sourcePath) {
    var folders = [];
    folders.push({ title: path.normalize(sourcePath), value: '.' });
    var allFiles = fs.readdirSync(sourcePath);
    allFiles.forEach(file => {
        if (fs.statSync(path.join(sourcePath, file)).isDirectory()) {
            folders.push({ title: path.join(sourcePath, file), value: file });
        }
    });
    return folders;
}
function getAllFiles(dirPath, arrayOfFiles) {
    var files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        }
        else {
            arrayOfFiles.push(path.join(process.cwd(), dirPath, file));
        }
    });
    return arrayOfFiles;
}
function getFileList(filePath, debugMode) {
    if (debugMode)
        console.log();
    log.debug('Building file list...');
    log.debug(`filePath: ${filePath}`);
    return getAllFiles(filePath, []);
}
function getTemplateFileList(dirPath, debugMode) {
    let fileList = [];
    var files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        if (file != APP_CONFIG_FILE) {
            if (file.startsWith(TEMPLATE_ROOT)) {
                if (debugMode)
                    console.log(`Found template file: ${file}`);
                fileList.push({ title: file, value: path.join(dirPath, file) });
            }
        }
    });
    return fileList;
}
function buildCategoryList(fileList, debugMode) {
    if (debugMode)
        console.log();
    log.debug('Building category list...');
    let categories = [];
    for (var fileName of fileList) {
        log.debug(`Parsing ${fileName}`);
        if (path.extname(fileName.toString().toLocaleLowerCase()) !== '.json') {
            var postFile = fs.readFileSync(fileName.toString(), 'utf8');
            var YAMLDoc = YAML.parseAllDocuments(postFile, { logLevel: 'silent' });
            var content = YAMLDoc[0].toJSON();
            var categoriesString = (content.categories) ? content.categories.toString() : '';
            if (categoriesString.length < 1) {
                categoriesString = UNCATEGORIZED_STRING;
                hasBlankCategory = true;
            }
            var catArray = categoriesString.split(',');
            for (var cat of catArray) {
                var category = cat.trim();
                var idx = categories.findIndex((item) => item.title === category);
                if (idx < 0) {
                    log.debug(`Found category: ${category}`);
                    if (category === UNCATEGORIZED_STRING) {
                        categories.push({ title: UNCATEGORIZED_STRING, value: '' });
                    }
                    else {
                        categories.push({ title: category, value: category });
                    }
                }
            }
        }
        else {
            log.debug(`Skipping ${fileName}`);
        }
    }
    if (!hasBlankCategory) {
        categories.push({ title: UNCATEGORIZED_STRING, value: '' });
    }
    return categories;
}
function directoryExists(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            return fs.lstatSync(filePath).isDirectory();
        }
        catch (err) {
            log.error(`checkDirectory error: ${err}`);
            return false;
        }
    }
    return false;
}
function findFilePath(endPath, thePaths) {
    let resStr = path.join(thePaths[thePaths.length - 1], endPath);
    for (var tmpPath of thePaths) {
        let destPath = path.join(tmpPath, endPath);
        log.debug(`Checking ${destPath}`);
        if (directoryExists(destPath)) {
            resStr = destPath;
            break;
        }
    }
    return resStr;
}
function buildConfigObject() {
    const theFolders = ['.', 'src'];
    return {
        editorCmd: 'code',
        openAfterCreate: false,
        paragraphCount: DEFAULT_PARAGRAPH_COUNT,
        postsFolder: findFilePath('posts', theFolders),
        promptCategory: true,
        promptTag: false,
        promptTargetFolder: false,
        promptTemplateFile: false,
        templateFile: TEMPLATE_FILE_DEFAULT,
        timeStamp: false,
        useYear: false,
    };
}
console.log(boxen(APP_NAME, { padding: 1 }));
console.log('\n' + APP_AUTHOR);
const myArgs = process.argv.slice(2);
const debugMode = myArgs.includes('-d');
const doPopulate = myArgs.includes('-p');
log.level(debugMode ? log.DEBUG : log.INFO);
log.debug('Debug mode enabled\n');
log.debug(`cwd: ${process.cwd()}`);
if (!checkEleventyProject()) {
    log.error('Current folder is not an Eleventy project folder.');
    process.exit(1);
}
log.debug('Project is an Eleventy project folder');
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
        let configObject = buildConfigObject();
        if (debugMode)
            console.dir(configObject);
        let outputStr = JSON.stringify(configObject, null, 2);
        outputStr = outputStr.replace(/\\/g, '/');
        outputStr = outputStr.replaceAll('//', '/');
        log.info(`Writing configuration file ${APP_CONFIG_FILE}`);
        try {
            fs.writeFileSync(path.join('.', APP_CONFIG_FILE), outputStr, 'utf8');
            log.info('Output file written successfully');
            log.info('\nEdit the configuration with the correct values for this project then execute the command again.');
        }
        catch (err) {
            log.error(`Unable to write to ${APP_CONFIG_FILE}`);
            console.dir(err);
            process.exit(1);
        }
        process.exit(0);
    }
    else {
        log.info('Exiting...');
        process.exit(0);
    }
}
log.debug('Validating configuration file');
const configFilePath = path.join(process.cwd(), APP_CONFIG_FILE);
if (!fs.existsSync(configFilePath)) {
    log.error(`Unable to locate the configuration file '${APP_CONFIG_FILE}'`);
    process.exit(1);
}
let configData = fs.readFileSync(configFilePath, 'utf8');
const configObject = JSON.parse(configData);
const validations = [{ filePath: configObject.postsFolder, isFolder: true }];
if (!configObject.promptTemplateFile) {
    validations.push({ filePath: configObject.templateFile, isFolder: false });
}
var res = await validateConfig(validations);
if (!res.result) {
    log.error(res.message);
    process.exit(1);
}
if (configObject.useYear && configObject.promptTargetFolder) {
    log.error('\nConfiguration error: Settings `useYear` and `promptTargetFolder` cannot be enabled simultaneously, exiting');
    process.exit(1);
}
const questions = [
    {
        type: 'text',
        name: 'postTitle',
        message: 'Enter a title for the post:'
    }
];
if (configObject.promptCategory) {
    let fileList = getFileList(configObject.postsFolder, debugMode);
    log.debug(`Located ${fileList.length} post files`);
    if (fileList.length > 0) {
        if (debugMode)
            console.dir(fileList);
        categories = buildCategoryList(fileList, debugMode);
        if (categories.length > 0)
            log.debug(`Found ${categories.length} categories`);
        categories = categories.sort(compareFunction);
        if (debugMode)
            console.table(categories);
        if (categories.length > 0)
            questions.push({
                type: 'multiselect',
                name: 'postCategories',
                message: 'Select one or more categories from the list below:',
                choices: categories,
                initial: 0
            });
    }
}
if (configObject.promptTargetFolder) {
    var targetFolders = getAllFolders(configObject.postsFolder);
    if (debugMode)
        console.dir(targetFolders);
    if (targetFolders.length < 1) {
        log.error(`No subfolders found in ${configObject.postsFolder}, exiting.`);
        process.exit(1);
    }
    questions.push({
        type: 'select',
        name: 'targetFolder',
        message: 'Select the target folder for the new post:',
        choices: targetFolders,
        initial: 0
    });
}
if (configObject.promptTemplateFile) {
    let fileList = getTemplateFileList(process.cwd(), debugMode);
    if (fileList.length < 1) {
        log.error(`No template files found in ${configObject.postsFolder}, exiting.`);
        process.exit(1);
    }
    questions.push({
        type: 'select',
        name: 'templateFile',
        message: 'Select the template file to use:',
        choices: fileList,
        initial: 0
    });
}
console.log();
let response = await prompts(questions);
if ((!response.postTitle) ||
    (configObject.promptTargetFolder && !response.targetFolder) ||
    (configObject.promptTemplateFile && !response.templateFile)) {
    log.info('\nCancelled by user');
    process.exit(0);
}
let postTitle = response.postTitle.trim();
log.debug(`\nTitle: ${postTitle}`);
let catList = [];
if (configObject.promptCategory) {
    if (response.postCategories && response.postCategories.length > 0) {
        if (!response.postCategories.includes('')) {
            catList = catList.concat(response.postCategories);
        }
        else {
            log.info('\nUncategorized selected, ignoring other selected categories');
        }
    }
    if (debugMode)
        console.dir(catList);
}
var templateFileName = configObject.promptTemplateFile ? response.templateFile : configObject.templateFile;
log.debug(`Template file: ${templateFileName}`);
templateExtension = path.extname(templateFileName);
log.debug('Reading template file');
const templateFile = fs.readFileSync(templateFileName, 'utf8');
let templateDoc = YAML.parseAllDocuments(templateFile, { logLevel: 'silent' });
let templateFrontmatter = JSON.parse(JSON.stringify(templateDoc))[0];
if (debugMode)
    console.dir(templateFrontmatter);
if (!templateFrontmatter) {
    log.error('The template file does not contain any YAML front matter, exiting');
    process.exit(1);
}
let outputFile = path.join(process.cwd(), configObject.postsFolder);
if (configObject.useYear) {
    outputFile = path.join(outputFile, new Date().getFullYear().toString());
}
if (configObject.promptTargetFolder) {
    outputFile = path.join(outputFile, response.targetFolder);
}
console.log();
if (!fs.existsSync(outputFile)) {
    log.info(`Creating target folder: "${outputFile}"`);
    fs.mkdirSync(outputFile, { recursive: true });
}
var fileName = postTitle.toLowerCase().replaceAll(' ', '-');
fileName = fileName.replaceAll('?', '');
fileName = fileName.replaceAll(':', '-');
fileName = fileName.replaceAll('---', '-');
fileName = fileName.replaceAll('--', '-');
fileName += templateExtension;
outputFile = path.join(outputFile, fileName);
log.debug(`Target file: ${outputFile}`);
if (fs.existsSync(outputFile)) {
    log.info(`File ${outputFile} already exists, exiting`);
    process.exit(1);
}
templateFrontmatter.title = postTitle;
let tmpDate = new Date();
templateFrontmatter.date = `${tmpDate.getFullYear()}-${zeroPad(tmpDate.getMonth() + 1)}-${zeroPad(tmpDate.getDate())}`;
if (configObject.timeStamp) {
    log.debug('Adding timestamp to front matter');
    templateFrontmatter.timestamp = tmpDate.toISOString();
}
if (configObject.promptCategory) {
    templateFrontmatter.categories = catList;
}
for (var key in templateFrontmatter) {
    templateFrontmatter[key] = (templateFrontmatter[key] !== null) && (templateFrontmatter[key] != "") ? templateFrontmatter[key] : '';
}
let tmpFrontmatter = YAML.stringify(templateFrontmatter, { logLevel: 'silent' });
tmpFrontmatter = tmpFrontmatter.replaceAll(': ""', ': ');
tmpFrontmatter = tmpFrontmatter.replace(/\n$/, '');
let newFile = templateFile.slice();
newFile = newFile.replace(YAML_PATTERN, tmpFrontmatter);
if (doPopulate) {
    log.info('Getting bacon ipsum text (this may take a few seconds)...');
    let fetchURL = `https://baconipsum.com/api/?type=all-meat&paras=${configObject.paragraphCount}&start-with-lorem=1`;
    log.debug(`fetchURL: ${fetchURL}`);
    let response = await fetch(fetchURL);
    let fillerText = await response.json();
    for (const item of fillerText)
        newFile += item + '\n\n';
}
log.info(`Writing content to ${outputFile}`);
fs.writeFileSync(outputFile, newFile, 'utf8');
if (configObject.openAfterCreate) {
    var localFile = '.' + path.sep + path.relative(process.cwd(), outputFile);
    log.info(`Opening ${localFile} in ${configObject.editorCmd}`);
    try {
        await execa(configObject.editorCmd, [localFile]);
    }
    catch (err) {
        log.error(err);
        process.exit(1);
    }
}
