Installing MPCParty
===================

## 1) Dependencies

### Ubuntu / Debian / Linux Mint
`sudo apt update && sudo apt install git mpd nodejs-legacy npm libav-tools build-essential libasound2 libasound2-dev && sudo npm install -g bower`

### Arch Linux / Antergos / Manjaro
`sudo pacman -Sy git mpd nodejs npm ffmpeg base-devel alsa-lib && sudo npm install -g bower`

### Fedora / Cent OS / RHEL
`sudo yum groupinstal "Development Tools" && sudo yum install epel-release`  
Install [mpd](http://mpd.wikia.com/wiki/Install)  
`sudo yum install nodejs npm alsa-lib-devel && sudo npm install -g bower`  
Install [libav](https://libav.org/download/) or [ffmpeg](http://ffmpeg.org/download.html)  
You may have issues running mpd. Good luck.

### Suse
`sudo zypper install -t pattern devel_basis`  
Install [mpd](http://mpd.wikia.com/wiki/Install)  
`sudo zypper install git nodejs npm alsa-devel libav-tools && sudo npm install -g bower`  
You may have issues running mpd. Good luck.

### Windows
Install [nodejs](https://nodejs.org/download/)  
Install [mpd](http://www.musicpd.org/download.html)  
Install [libav](https://libav.org/download/) or [ffmpeg](http://ffmpeg.org/download.html)  
You will need nodejs to be in your path. The youtube player will not work unless you install several versions of visual studio (I have no idea), so running `npm install` will throw errors, but MPCParty should still be able to run.

## 2) Release version
Download the latest release from the GitHub [releases](https://github.com/jplsek/MPCParty/releases) page.

## 2) Development version (should be stable)
* Clone this repository (`git clone https://github.com/jplsek/MPCParty`)
* Run `npm install` from the project's directory (to install all the libraries)
* You can also get the node\_modules and bower\_modules folder from the latest release so you don't need to download everything if you decide to clone the repository.

## 3) Running
* Now get a running instance of mpd working.
    * A sample mpd conf file is stored in utils/ to be ran as a local user (Setup: `mkdir -p ~/.config/mpd/playlists`. Run it with `mpd utils/mpd.conf`. Note: You may need to stop other instances of mpd with `sudo systemctl stop mpd mpd.socket`.)
* Start MPCParty with `./run.sh` from this directory (or `npm start`)
* Done

## 4) Auto restarts (recommended!)
* Users: install [forever](https://github.com/foreverjs/forever#installation) then start `./run.sh` again.
* Server admins: copy the reference systemd service file in utils/ and set it up to your needs
