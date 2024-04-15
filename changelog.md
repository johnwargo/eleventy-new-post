# Changelog

## 20240415 (v0.0.17)

Added code to trim the post title, removing leading and trailing spaces. I noticed this when I accidentally added an extra space to the end of a title and the file name ended with a `-`.

## 20240405 (v0.0.16)

Added `timeStamp` configuration option that when enabled adds a `timestamp` property to the new post's front matter with the current timestamp. Requested in [Time Support in Date Property](https://github.com/johnwargo/eleventy-new-post/issues/2).

## 20240218 (v0.0.15)

Added a configuration option `promptTemplateFile` which configures the utility to prompt the user for the template file for the new post. Place one or more template files in the folder matching the file name `11ty-np*.*` and the utility will grab all of them and prompt the user (ignoring the `11ty-np.json` file because that's the config file and can't be used as a template).

## 20240207 (v0.0.14)

Added a configuration flag to enable/disable category prompt to cover situations where Category isn't used in the site.

## 20240206 (v0.0.12 & v0.0.13)

Added a new configuration option called `promptTargetFolder`; with this enabled, the utility will scan the configured posts folder (defined in the `postsFolder` configuration option) for sub-folders then prompt you to select one of the folders as the destination for the generated post file.

## 20240127 (v0.0.11)

* Automatically create target folder if it does not exist. I added this because when 2024 started, the command failed in projects where I had date folders enabled (`useYear`) but I'd not yet created the folder for 2024. 

## 20231231 (v0.0.10)

Refactored package to handle Uncategorized posts better:

* Adds the Uncategorized category to the category list the even if there are no existing uncategorized posts.
* If Uncategorized is selected along with other categories, the category selections are ignored and the package saves the file as an Uncategorized post.

## 20231230 (v0.0.9)

Fixed logic errors related to Uncategorized posts

## 20231230 (v0.0.8)

Added support for selecting multiple categories.

## 20231025

Added a configuration option to automatically open the newly created post file after creation, using a specified editor command. Also refactored the code a little to make it cleaner.

## 20230525

Removed unneeded dependency (Eleventy)

## 20230430

Fixed an issue where empty front matter properties were set with `null`; updated the code to remove the null and replace it with an empty string.
