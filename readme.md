# Eleventy New Post

A simple command-line utility that creates a new post for an [Eleventy](https://www.11ty.dev/) site from a template.

Doing this manually is not hard, all you have to to do is copy an earlier post or an empty post you keep lying around to the right location, rename the file and replace the post content with new stuff. 

This package does all that, and a little more, automatically and faster. Here's what it does:

1. Ensures that its running in an Eleventy site project
2. Reads all of the post files in the project to build a list of all of the Categories in use in the site
3. Prompts you to provide the title for the post
4. Prompts you to select a single category for the post (you can add other categories when you edit the generated post file)
5. Creates a new post file using a template file you provide, copies it to the correct `posts` folder, and, finally, sets the post file's title and category.

If you're generating dummy documents to test some aspect of a new site, you can optionally populate each generated post file with [Bacon Ipsum](https://baconipsum.com/) content generated using the [Bacon Ipsum JSON API](https://baconipsum.com/json-api/).

## Installation

Open a terminal window or command prompt and execute the following command:

```shell
npm install -g eleventy-new-post
```

This installs the package globally and adds a `11ty-np` command you can use from anywhere on your system.

If you prefer not to install it, you can execute it at any time in a terminal window or command prompt using:

```shell
npx eleventy-new-post
```

## Setup

The package uses a simple, self-generated configuration file to keep you from having to remember and use a variety of weird command-line options. 

Open a terminal window or command prompt in an Eleventy project's root folder and execute the following command:

```shell
11ty-np
```

The package will check to see that you're running the command in an Eleventy project then look for its configuration file `11ty-np.json`. If it doesn't find the file, you'll be prompted to create it as shown below:

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

Configuration file '11ty-np.json' not found
Rather than using a bunch of command-line arguments, this tool uses a configuration file instead.
In the next step, the utility will automatically create the configuration file for you.
Once it completes, you can edit the configuration file to change the default values and execute the command again.

? Create configuration file? » (Y/n)
```

Press the `n` key on the keyboard if you don't want to generate the configuration file, otherwise press `y` to generate the file:

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

Configuration file '11ty-np.json' not found
Rather than using a bunch of command-line arguments, this tool uses a configuration file instead.
In the next step, the utility will automatically create the configuration file for you.
Once it completes, you can edit the configuration file to change the default values and execute the command again.

√ Create configuration file? ... yes
Writing configuration file 11ty-np.json
Output file written successfully

Edit the configuration with the correct values for this project then execute the command again.
```

When it completes, you'll have a new file in the project's root called `11ty-np.json` with the following or similar contents (depending on your project's folder setup):

```json
{
  "editorCmd": "code",
  "openAfterCreate": true,
  "paragraphCount": 4,
  "postsFolder": "src/posts",
  "promptTargetFolder": false,
  "templateFile": "11ty-np.md",  
  "useYear": true
}
```

Edit the configuration settings as needed for your project. 

Now, lets talk about the configuration options (in alphabetical order).


### `editorCmd`

With `openAfterCreate` set to `true, the utility opens the newly created post file using the editor executable provided here. The value defaults to `code` (Visual Studio Code).

### `openAfterCreate`

When `true`, the utility automatically opens the newly created post for editing using the editor command specified in `editorCmd`.

### `paragraphCount`

The `-p` command-line flag (described below) allows you to generate dummy content for new posts. As an example, if you were simply using the command to populate a site with a set of posts for testing or demonstration purposes. 

The `paragraphCount` configuration option controls how many paragraphs of content to request from the [Bacon Ipsum JSON API](https://baconipsum.com/json-api/) and add to a new post. The value here must be between 1 and 100.

### `postsFolder`

Since the command scans all existing post files to build the list of categories, it needs to know where to look for files. Also, it needs to know where to store the files it generates. The `postsFolder` configuration option describes that location. 

When generating the configuration file, the command scans the local project for possible post folder options, so you may see that the configuration option is already populated with the correct value for your project.  If not, populate this configuration variable with the correct value for your project, it should contain a relative path pointing to the project's `posts` folder.

**Note:** If the target posts folder doesn't exist, the utility will create it automatically.

### `promptTargetFolder`

When you're working in an Eleventy project that stores post content in multiple folders (for example `posts` and `news`), enable the `promptTargetFolder` option to have the utility prompt you to select the target folder when creating a new post. 

When you enable this option, the utility scans the folder location defined in `postsFolder` for subfolders then displays the source folder plus the subfolder list when creating a new post as shown in the example below:

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

√ Enter a title for the post: ... Bonfire Planning
√ Select one or more categories from the list below: » People
? Select the target folder for the new post: » - Use arrow-keys. Return to submit.
>   src\posts
    src\posts\vacations
    src\posts\purchases
    src\posts\cars
```

After you select a folder name from the list, the utility writes the new post to the selected folder.

**Note:** The configuration settings `useYear` and `promptTargetFolder` are mutually exclusive; you can't enable both in your configuration.

### `templateFile`

Every Eleventy site is setup differently, with different values in the Post template's front matter and content. To make it easier for users, you can simply create the default Post template that works for your site and populate the `templateFile` configuration with the relative path pointing to the file.

Here's an example template markdown file called `11ty-np.md`:

```markdown
---
layout: default
title: 
date:
categories: 
---
```

That's all you really need to make this work. If your site uses a different front matter configuration, simply create a sample post file template, save it to the project's root folder and enter the file name (including extension) in the `templateFile` configuration value. Even if you don't have `title`, `date`, and `categories` in your template front matter, those properties will get added automatically when the command executes.

### `useYear`

Some Eleventy site projects store posts in a separate folder per year, some don't - it's a developer choice and this tool has to be flexible. This configuration property controls where the program stores generated post files. 

* Set `useYear` set to false to store new posts in the `postsFolder` folder. Using the example configuration file above, this means new post files save to `./src/posts`.  
* Set `useYear` set to true to store new posts in the `postsFolder` folder plus an additional subfolder for the year. Using the example configuration file above, this means new post files save to `./src/posts/2024`. 

**Note:** If the target posts folder doesn't exist, the utility will create it automatically.

**Note:** The configuration settings `useYear` and `promptTargetFolder` are mutually exclusive; you can't enable both in your configuration.

## Usage 

 With the configuration file properly configured for your Eleventy project, open a terminal window or command prompt in the project folder and execute the following command:

```shell
11ty-np
```

The program will prompt you for the name for the article as shown below:

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

? Enter a title for the post: »
```

Enter A title for the post and press Enter; the program writes the title to the template file's front matter and uses the title for the file name. 

If this is the first post in your site, at this point it will generate the post file and store it in the project using the location settings in the configuration file.

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

√ Enter a title for the post: ... Sample Post

Writing content to D:\dev\node\11ty-new-post\src\posts\2023\sample-post.md
```

When you generate a new post in a populated site, the program will prompt you to select a Category from the list of categories used in your site as shown below:

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

√ Enter a title for the post: ... Sample Post
? Select one or more categories from the list: »                                                                                                 
Instructions:
    ↑/↓: Highlight option
    ←/→/[space]: Toggle selection
    a: Toggle all
    enter/return: Complete answer
( )   Cats
( )   Dogs
( )   Turtles
( )   Uncategorized   
```

Use the arrow keys as directed in the prompt to select one or more categories from the list, then press Enter to continue. Press Enter without making a selection to assign no categories to the post. At this point, the program will write the generated post file to the project and close.

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

√ Enter a title for the post: ... Sample Post
√ Select one or more categories from the list: » Cats, Dogs

Writing content to D:\dev\node\11ty-new-post\src\posts\2023\sample-post.md
```

If you enable the `-p` (populate) flag as shown below:

```shell
11ty-np -p
```

The program will do all those things described above, then use the [Bacon Ipsum JSON API](https://baconipsum.com/json-api/) to retrieve content paragraphs for the post and append them to the end of the template file.

```text
┌───────────────────┐
│                   │
│   11ty New Post   │
│                   │
└───────────────────┘

by John M. Wargo (https://johnwargo.com)

√ Enter a title for the post: ... Populated Post
√ Select one or more categories from the list: » Dogs

Getting bacon ipsum text (this may take a few seconds)...
Writing content to D:\dev\node\11ty-new-post\src\posts\2023\populated-post.md
```

Here's the content of a populated post file. Notice how the title, date, and categories front matter properties are automatically populated for you.

```markdown
---
layout: default
title: Populated Post
date: 2023-04-18
categories:
  - Dogs
---
Bacon ipsum dolor amet rump beef ribs venison salami bacon jerky.  Ribeye
leberkas cupim t-bone, salami rump prosciutto strip steak.  Ham tenderloin 
porchetta andouille buffalo.  Pig kielbasa bacon beef ribs cupim pastrami 
pork belly filet mignon.  Landjaeger cupim rump capicola.  Bacon landjaeger 
strip steak, tail venison sirloin swine meatball turducken flank jowl 
prosciutto.

Pig sirloin biltong hamburger venison drumstick, shank chislic ribeye 
turducken jowl.  Ham tongue bacon short ribs ham hock shankle turducken 
fatback pork chop.  Capicola bacon burgdoggen picanha, rump short ribs 
short loin shankle filet mignon chuck kevin tongue porchetta.  Filet 
mignon jerky ham hock beef ribs short loin brisket shank turducken ball tip.

Cow boudin alcatra spare ribs.  T-bone hamburger ground round picanha short 
ribs, strip steak venison tri-tip pork sausage brisket swine kevin bresaola 
capicola.  Chicken pig ham hock biltong beef tongue.  Pastrami drumstick 
pig turducken ball tip tenderloin.  Kevin hamburger jerky, pig meatloaf 
picanha filet mignon turducken beef shank sirloin buffalo cow chislic turkey.  
Corned beef chuck bacon shank shankle short ribs short loin tri-tip bresaola 
salami.

Bresaola shank pig pork chop ham doner.  Rump picanha chicken meatball, shank
pig pork.  Tail picanha venison pork chop ham jowl kielbasa t-bone.  Pork 
loin ham beef ribs ribeye, tenderloin spare ribs shankle fatback short loin
tail andouille sirloin filet mignon.  Salami prosciutto alcatra swine jerky 
chicken short loin.  Sausage landjaeger short ribs porchetta venison cow 
doner filet mignon short loin.
```

If something's not working like you expect or you think there's something wrong, you can enable Debug Mode using the `-d` flag on the command line:

```shell
11ty-np -d
```

With this enabled, the program writes more detailed information to the console as it executes.

### Getting Help Or Making Changes

Use [GitHub Issues](https://github.com/johnwargo/11ty-new-post/issues) to get help with this utility.

Pull Requests gladly accepted, but only with complete documentation of what the change is, why you made it, and why you think its important to have in the utility.

***

If this code helps you, please consider buying me a coffee.

<a href="https://www.buymeacoffee.com/johnwargo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>