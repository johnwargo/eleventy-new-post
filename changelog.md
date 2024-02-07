# Changelog

## 20240208 (v0.0.12 & v0.0.13)

Added a new configuration option called `promptTargetFolder`; with this enabled, the utility will scan the configured posts folder (defined in the `postsFolder` configuration option) for subfolders then prompt you to select one of the folders as the destination for the generated post file.

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
