Installing MPCParty
===================

## 1) Dependencies

### Ubuntu / Debian / Linux Mint
`sudo apt update && sudo apt install git mpd nodejs npm ffmpeg && sudo npm install -g yarn`

### Arch Linux / Antergos / Manjaro
`sudo pacman -Sy git mpd nodejs npm ffmpeg && sudo npm install -g yarn`

### Fedora / Cent OS / RHEL
Set up [RPM Fusion](https://rpmfusion.org/Configuration)  
`sudo yum install epel-release`  
`sudo yum install git mpd nodejs npm ffmpeg && sudo npm install -g yarn`

### Suse
`sudo zypper install git mpd nodejs npm ffmpeg && sudo npm install -g yarn`

### Windows
Install [nodejs](https://nodejs.org/download/)  
Install [mpd](http://www.musicpd.org/download.html)  
Install [ffmpeg](http://ffmpeg.org/download.html)  
You will need nodejs to be in your path.

## 2) Release version
Download the latest release from the GitHub [releases](https://github.com/jplsek/MPCParty/releases) page.

## 2) Development version (should be stable)
* Clone this repository (`git clone https://github.com/jplsek/MPCParty`)
* Run `yarn` from the project's directory (to install all the libraries)

## 3) Running
* Now get a running instance of mpd working.
    * A sample mpd conf file is stored in utils/ to be ran as a local user (Setup: `mkdir -p ~/.config/mpd/playlists`. Run it with `mpd utils/mpd.conf`. Note: You may need to stop other instances of mpd with `sudo systemctl stop mpd mpd.socket`.)
* Start MPCParty with `./run.sh` from this directory (or `npm start`)
* Done

## 4) Auto restarts (recommended!)
* Users: install [forever](https://github.com/foreverjs/forever#installation) then start `./run.sh` again.
* Server admins: copy the reference systemd service file in utils/ and set it up to your needs
