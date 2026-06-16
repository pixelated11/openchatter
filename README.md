# Openchatter
OpenChatter is a simple, desktop application built on electron, used to chat models from an LLM provider. It only requires 2 thing to be set up:
- a json config, with api, endpoint, and prefered model
- Active internet connection

## Getting started
> [!NOTE] For users installing .pacman file
> It currently depends on `http-parser`, which you can only get using an AUR helper. please do
> install the dependency first before doing `pacman -U`.
First, either download a prebuilt binary from the releases page, or build it yourself.
### Configuring the API key, endpoint and model
To start using the application, you must first set up your API key, your API provider's endpoint, and your prefered model. To do this, 
simply go to the `userData` directory of the application, and edit the confiig.json file.
- Windows: `%APPDATA%/openchatter/config.json`
- Linux: `~/.config/openchatter/config.json`
After opening the file, set your API key, endpoint, and AI model that you will use. Note that the AI model will be used globally, so it's not session-based.

### Running the app
To run the app locally, from the git repository, run:
`npm run start`

Or if you installed the app via the prebuilt package, just open the app as usual, and enjoy chatting.

## Build instructions
To build the app, first, clone the repository:
```
git clone https://github.com/pixelated11/openchatter.git && cd openchatter
```
Then, install the npm devDependencies:
```
npm install
```
After that, build the electron app:
- For windows: `npm run build --win`
- For linux: `npm run build --linux`
The executable will be on the `dists/` folder.

## Contributions
Contributions are welcome. If you are willing to donate, see my crypto addresses on https://pixelated11.github.io/links.html. If you want to contribute in the code,
read the **code of conduct**, and email me (itspixelatd@proton.me) to request contribution.
