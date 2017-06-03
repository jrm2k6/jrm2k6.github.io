---
layout: post
title: Install Genymotion on Debian for Android development
---

Not so long ago, I had to move back to my personal machine which was running Ubuntu.
I have been using Ubuntu for a while now, even if my last two years of development have been done on Mac Os.
I decided to give a try to Debian, a bit randomly.

After having used Debian for daily activities (browsing, python/flask development), I needed to setup my Android environment again as I plan to work on some applications.

This post will guide you through the journey of installing all the tools needed to be able to implement and run your android application on an emulator using Debian Wheezy (32 bits, this has its importance).



### Installing the JDK ###
Open your terminal and enter the following command:

    sudo apt-get install openjdk-7-jdk

This will install the jdk version 7.
At the end of the installation, you can check that everything is correct by verifying the ouput of

    javac -version

You should get something similar to this:

    jrm2k6@lenny:~$ javac -version
    javac 1.7.0_65




### Installing Android Studio ###

Go to https://dl.google.com/android/studio/install/0.8.6/android-studio-bundle-135.1339820-linux.tgz
Download the file and when it is done, go to the directory where you have stored it.
(If the link is a 404, just go to https://developer.android.com/sdk/installing/studio.html and download the Linux version)/

To extract the files fron the archive:

    tar -xvzf android-studio-bundle-135.1339820-linux.tgz

When it is done:

    cd android-studio
    ./bin/studio.sh

That should run Android Studio. You will have to install it first but this is how you should run it from the command line.

The Android SDK is also included in the archive, so if it asks for a location of your Android SDK you can choose this one. It should also use the one included in the android-studio folder by default.



### Installing Genymotion ###

Genymotion is available only for Debian 64 bits. My machine is using a 32 bits architecture so I didn't have a real solution.
The first step is to download VirtualBox and to install it. Go to https://www.virtualbox.org/wiki/Linux_Downloads and download the right version for yourself.

Install it as usual:

    sudo dpkg -i virtualbox-4.3_4.3.16-95972~Debian~wheezy_i386.deb


The next step is to install Genymotion. As indicated by the Genymotion guys on the irc channel [#genymotion](http://irc2go.com/webchat/?net=freenode&room=genymotion), I donwloaded the Ubuntu 32bits version and tried to run it.

You can get it here: https://cloud.genymotion.com/page/launchpad/download/
Select the 32 bits version and download it.

When it is done:

    chmod 755 genymotion-2.2.2_x86.bin
    ./genymotion-2.2.2_x86.bin

At the end of the installation you can try to go in the genymotion folder and execute:

    ./genymotion

At this point, it should fail with the following message:

    /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.15' not found (required by...)

The version that you use is probably the 2.13.
You can verify that by running the following command:

    jrm2k6@lenny:~$ ls -la /lib/i386-linux-gnu/libc.so.6
    lrwxrwxrwx 1 root root 12 Sep 13 02:18 /lib/i386-linux-gnu/libc.so.6 -> libc-2.13.so

So you just need to upgrade your libc6 version to have at least the 2.15 version.
*This is not usually advised as you are going to have a mixed system, between the stable debian branch and the testing one, which contains an updated version of libc6 by default.*

We have to be able to install packages from the testing branch using apt.
The first step is to add the testing branch to your ```sources.list``` for apt.
To do so, open the file:

    sudo vi /etc/apt/sources.list

Append this to it:

    # Testing repository
    deb http://http.us.debian.org/debian testing main non-free contrib
    deb-src http://http.us.debian.org/debian testing main non-free contrib

    deb http://security.debian.org/ testing/updates main contrib non-free
    deb-src http://security.debian.org/ testing/updates main contrib non-free

We need now to do some "apt pinning".
We want to be able to give some priorities to the origin of the packages we want to update.

This will be only two simple steps.
First, open ```/etc/apt/apt.conf```. This file probably doesn't exist if you are on a fresh Debian installation.

Add ```APT::Default-Release "stable";``` as its content.

Then, create ```/etc/apt/preferences```
Add the following content to it:

    Package: *glibc*
    Pin: release a=testing
    Pin-Priority: 10

    Package: *
    Pin: release a=stable
    Pin-Priority: 900


This indicates that for the package glibc and related package containing this string, it will always use the testing branch to install updates. The other packages are going to use the stable branch, as recommended.


Now that we are done with those configuration steps, it is time to install the right libc version.

    sudo apt-get update


Then, let's check what the policy is going to be for the installation of glibc.

    jrm2k6@lenny:~$ apt-cache policy libc6-dev
    libc6-dev:
    Installed: 2.13-38
    Candidate: 2.19-11
    Version table:
    *** 2.19-11 0
        500 http://http.us.debian.org/debian/ testing/main i386 Packages
        100 /var/lib/dpkg/status
     2.13-38+deb7u4 0
        990 http://security.debian.org/ wheezy/updates/main i386 Packages
     2.13-38+deb7u2 0
        990 http://ftp.se.debian.org/debian/ wheezy/main i386 Packages


Sweet! It is going to install the 2.19 version when we request for a new libc6-dev library.
Run ```sudo apt-get install libc6-dev``` to install a new version.

After that, just go back to your genymotion folder and execute ```./genymotion``` again.
Everything should work as expected.


### Run and enjoy ###

After having installed the SDK tools and libraries needed for your android project, and the Genymotion plugin in Android Studio, you should be able to run everything smoothly.

One issue you could have could be with VirtualBox not restarting properly.
You can fix it easily by following the steps mentionned [here]( https://cloud.genymotion.com/page/faq/#vbox)


### Sources ###

- [How to keep a mixed system](https://www.debian.org/doc/manuals/apt-howto/ch-apt-get.en.html#s-default-version)
- [Enable testing repo debian](http://www.binarytides.com/enable-testing-repo-debian/)

### Conclusion ###
Let me know if it helps, or if it doesn't work for you as I might have omitted some steps by accident. You can leave a comment here or contact me on [twitter](http://twitter.com/jrm2k6).
