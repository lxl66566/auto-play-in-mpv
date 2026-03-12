# Auto play in MPV

Automatically redirect to mpv player when playing online video.

## Installation / Usage

1. install auto-play-in-mpv: `pip install auto-play-in-mpv` or `uv tool install auto-play-in-mpv`, start the server by executing `apim` in your terminal.
2. install tampermonkey/violentmonkey in your browser
3. [install the script from greasyfork](https://greasyfork.org/zh-CN/scripts/505562-auto-play-in-mpv)
4. just click a video from supported sites. (this script mainly works on bilibili. youtube support is not tested yet)

## mpv config

Note that this is just [my config example](https://github.com/lxl66566/nixos-config/tree/main/config/mpv/profile.conf). You may need to change some settings.

If you find mpv is not playing the video, you may need to run `mpv https://bilibili.com/video/xxx` to test if your mpv profile is working.

## Autostart server

It's better to start the websocket server automatically at startup.

- On general platforms: please use my another script [user-startup-rs](https://github.com/lxl66566/user-startup-rs)!
- On NixOS: Add this to your `configuration.nix`
  ```nix
  systemd.user.services.apim = {
    enable = true;
    description = "Open online video in local mpv player";
    script = "~/.local/bin/apim";
    wantedBy = [ "default.target" ];
    path = with pkgs; [
      mpv
      yt-dlp
    ];
  };
  # do not forget to add your current user to some groups
  users.users.<your_user_name> = {
    isNormalUser = true;
    extraGroups = [
      "wheel"
      "networkmanager"
      "video"
      "render"
      "audio"
    ];
  };
  ```

## Supported sites

- [x] bilibili (video, live)
- [x] youtube

## TODO

- [x] auto start
- [ ] fix behavior on youtube

## License

MIT
