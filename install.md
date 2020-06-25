Installing MPCParty
===================

## MPD

* Get a running instance of mpd working.
    * A sample mpd conf file is stored in utils/ to be ran as a local user (Setup: `mkdir -p ~/.config/mpd/playlists`. Run it with `mpd utils/mpd.conf`. Note: You may need to stop other instances of mpd with `sudo systemctl stop mpd mpd.socket`.)

## With Docker

```sh
git clone https://github.com/jplsek/MPCParty && cd MPCParty
cp mpcparty.cfg.example mpcparty.cfg
```

- Change the config `[mpd] url` to be the ip of your system running mpd, not `localhost`!

### With docker-compose

Make sure to change docker-compose.yml pointing the music directory to where your music is actually stored.

```
docker-compose up
```

### With Plain Docker

#### Building

```sh
docker build -t mpcparty .
```

#### Running with environment variables

```sh
docker run -it -p 8081:8081 -e MPD_URL=$YOUR_MPD_URL -v $YOUR_MUSIC_DIRECTORY:/music mpcparty
```

#### Running with the config file

Make sure to update `[mpd] url` as mentioned above!

```sh
docker run -it -p 8081:8081 -v $(pwd)/mpcparty.cfg:/app/mpcparty.cfg -v $YOUR_MUSIC_DIRECTORY:/music mpcparty
```

## Without Docker - Running on the Host System

## 1) Dependencies

### Ubuntu / Debian / Linux Mint
`sudo apt update && sudo apt install git mpd nodejs npm ffmpeg && sudo npm install -g yarn`

### Arch Linux / Antergos / Manjaro
`sudo pacman -Sy git mpd nodejs npm ffmpeg yarn`

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

## 2) Download MPCParty
You can either get the release version or the development version.
The main difference is that the release version doesn't require installing the node libraries nor git to be installed.
However, I recommend using the development version since it should have the latest features and bug fixes.

### Development version
```sh
git clone https://github.com/jplsek/MPCParty && cd mpcparty
cp mpcparty.cfg.example mpcparty.cfg
yarn install
```

### Release version
Download the latest release from the GitHub [releases](https://github.com/jplsek/MPCParty/releases) page.

## 3) Running
* Start MPCParty with `./run.sh` from this directory (or `yarn start`)
* Done

## 4) Auto restarts (recommended!)
* Users: install [forever](https://github.com/foreverjs/forever#installation) then start `./run.sh` again.
* Server admins: copy the reference systemd service file in utils/ and set it up to your needs
