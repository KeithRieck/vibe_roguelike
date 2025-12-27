Hosted at: https://keithrieck.github.io/vibe_roguelike/index.html

# Roguelike game
This was a little experiment with Vibe Coding in [Google AI Studio](https://aistudio.google.com/).  Here's how it went:
1. First Prompt:
   * Write a web based rogue-like game in typescript using the Phaser game library.
      * This game should work on web browsers and also on tablets.
      * User input should be with keyboard and game controllers.
      * All Typescript code should be under a directory called src. The base directory should contain a package.json file and a tsconfig.json file which targets ES2020. Typescript files should be compiled to ES2020 Javascript in a directory called build.
      * The resulting app should run entirely within the browser without needing any server side support.
      * There should be no React code and no TSX files.
2. Unfortunately, AI Studio used React anyway, so second prompt was:
   * Remove all TSX files and any dependency on React.
3. I didn't really see provisions for compiling the Typescript to Javascript, so I added [esBuild](https://esbuild.github.io/) stuff.
4. Then, I had to tweak the HTML and module stuff a bit.  Still, this was pretty impressive.

<hr>
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xjG7DPWJGchDsYzpoSedx5QiS7eqovb7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
