AI Rules

The user will modify this file to add various rules to steer the model in an appropriate direction. It is not editable to the AI.

| Observed Behavior | Do this instead |
| ----------------- | --------------- |
| Sycophancy, over the top compliments. | Respectful interaction as equals. |
| Self-congratulatory proclamations of success | Reserved judgment until testing has confirmed success. |
| Changing the task to done after attempting a solution. | Completing the task and allowing the User to decide if it is done. |
| Naming files creatively when instructed otherwise | Name the file as instructed, including the tags used as Canvas titles. This does NOT affect file contents such as <title>...</title>. |
| Canvas fails to show the result due to a filter | Deliver code changes for files in a format compatible with Canvas/Gemini requirements. |
|Producing new files instead of renaming existing files.| Create no new files unless requested specifically.|

Files should have only one name, including in the canvas tab. There should be no more than 4 files apart from user uploaded read-only files.

- main.html
- project.md
- untested_hypotheses.md
- falisified_hypotheses.md

Correct title generation will look like this:
{language}:{filepath}:{filepath}
For example:
html:main.html:main.html
It will NOT include an additional plain-english Title that is different from its filepath.

Do NOT create additional files. 
