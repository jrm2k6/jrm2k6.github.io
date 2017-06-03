---
layout: post
title: Alwaysdata
---

### Context ###
I have been using the service offered by alwaysdata for more than two years now. I have deployed some ruby on rails apps, and some django apps too. This time, I decided to give a flask application a try. It hasn't been that easy. For your information, I am far from being proficient with any system administration work, so I got frustrated pretty quickly. The documentation on alwaysdata related to deploying a flask application was almost non-existent. This is why I decided to write this post, which will take you through:

- installation of a custom python (2.7.5)
- installation of setuptools and pip
- installation of virtualenv
- installation of flask and requirements of your app
- creation of your wsgi file
- troubleshooting


#### Installation of a custom python ###
----------------------------------------

	jeremydagorn@ssh:~ $ cd
	jeremydagorn@ssh:~ $ mkdir python
	jeremydagorn@ssh:~ $ cd python
	jeremydagorn@ssh:~/python $ mkdir src
	jeremydagorn@ssh:~/python $ cd src

Here, we created the folder which will contain our python version that we download by doing the following:

	jeremydagorn@ssh:~/python/src $ wget http://www.python.org/ftp/python/2.7.5/Python-2.7.5.tgz
	jeremydagorn@ssh:~/python/src $ tar xvfz Python-2.7.5.tgz
	jeremydagorn@ssh:~/python/src $ cd Python-2.7.5


We extract the files from the archive and install python:

	jeremydagorn@ssh:~/python/src/Python-2.7.5 $ mkdir ~/python/python27
	jeremydagorn@ssh:~/python/src/Python-2.7.5 $ ./configure --prefix=~/python/python27
	jeremydagorn@ssh:~/python/src/Python-2.7.5 $ make
	jeremydagorn@ssh:~/python/src/Python-2.7.5 $ make install

You can of course name `python27` whatever you want. Just be careful while following the next steps of the tutorial.


The next step is to make the system recognize the newly installed python as the default one. To do so, just declare it in your `.bash_profile`.

	jeremydagorn@ssh:~/python/src $ echo "export PATH=$HOME/python/python27/bin:$PATH" >> ~/.bash_profile
	jeremydagorn@ssh:~/python/src $ source ~/.bash_profile

To verify that your system is using your newly installed python:

	jeremydagorn@ssh:~/python/src $ which python

If everything worked as expected, you should see something like this:

	jeremydagorn@ssh:/home/jeremydagorn/python/python27/bin/python


#### Installation of setuptools and pip ###
----------------------------------------

Verify that you are still in the src file of your python directory.

	jeremydagorn@ssh:~/python/src $ wget https://pypi.python.org/packages/source/s/setuptools/setuptools-1.1.6.tar.gz --no-check-certificate
	jeremydagorn@ssh:~/python/src $ tar xvfz setuptools-1.1.6.tar.gz
	jeremydagorn@ssh:~/python/src $ cd setuptools-1.1.6
	jeremydagorn@ssh:~/python/src/setuptools-1.1.6 $ python setup.py install
	jeremydagorn@ssh:~/python/src/setuptools-1.1.6 $ cd ..
	jeremydagorn@ssh:~/python/src $ wget https://pypi.python.org/packages/source/p/pip/pip-1.4.tar.gz --no-check-certificate
	jeremydagorn@ssh:~/python/src $ tar xvfz pip-1.4.tar.gz
	jeremydagorn@ssh:~/python/src $ cd pip-1.4
	jeremydagorn@ssh:~/python/src/pip-1.4 $ python setup.py install


Nothing crazy here, we just download, extract the files from the archives and install (as the title says actually).

#### Installation of virtualenv ###
----------------------------------------

Now that `pip` is installed, installing `virtualenv` and `virtualenvwrapper` is really easy.

	jeremydagorn@ssh:~ $ pip install virtualenv
	jeremydagorn@ssh:~ $ pip install virtualenvwrapper

Now, let's create a folder which will contain our future virtualenv:

	jeremydagorn@ssh:~ $ cd
	jeremydagorn@ssh:~ $ mkdir .virtualenvs
	jeremydagorn@ssh:~ $ echo ". /home/jeremydagorn/python/python27/bin/virtualenvwrapper.sh" >> .bash_profile
	jeremydagorn@ssh:~ $ source .bash_profile
	jeremydagorn@ssh:~ $ mkvirtualenv env

Once again, you can specify the name of your virtualenv to match the project using it, so it is easy to identify.


#### Installation of flask and requirements of your app ####
----------------------------------------
Here, I consider the case where you have copied/cloned the repo containing your code to your workspace.

Go into your project repository:

	jeremydagorn@ssh:~$ cd www/jeremydagorn-blog/
	jeremydagorn@ssh:~/www/jeremydagorn-blog$ ls
	authentication.py   base.pyc         database.py  installation.py  models.py   posts.py   README.md         static        update-virtualenv.sh
	authentication.pyc  config.pyc       forms.py     jdblog.db        models.pyc  posts.pyc  requirements.txt  templates     wtfcustomwidgets.py
	base.py             config.py.local  forms.pyc    jdblog.wsgi      posts       Procfile   schema.sql        test_base.py  wtfcustomwidgets.pyc

If you have a requirements.txt file containing all your requirements and dependencies (or equivalent) simply run:

	jeremydagorn@ssh:~ $ pip install -r requirements.txt

This will install all the dependencies using pip.
To be able to create this kind of file, just run:

	pip freeze > file_which_will_contain_dependencies_name


#### Creation of your wsgi file ####
----------------------------------------

To be able to run your app, you need to create a WSGI file. This file contains the code which is executing on startup to get the application object.

In most of the cases, it should just be able to import your app and will contain something like:

	from base import app as application

`base.py` in my case being the file containing my main method.

You also need to tell this file to start your virtual environment, to get all the different dependencies you use.

You also need to tell this file which python-modules you should use. You can use the method `addsitedir()` of the module site.

Then, you will have something that looks like the following:

	import os
	import sys
	import site

	ALLDIRS = ['/home/jeremydagorn/.virtualenvs/env7/lib/python2.7/site-packages']

	# Remember original sys.path.
	prev_sys_path = list(sys.path)

	# Add each new site-packages directory.
	for directory in ALLDIRS:
	  site.addsitedir(directory)

	# Reorder sys.path so new directories at the front.
	new_sys_path = []
	for item in list(sys.path):
	    if item not in prev_sys_path:
	        new_sys_path.append(item)
	        sys.path.remove(item)
	sys.path[:0] = new_sys_path

	activate_this = '/home/jeremydagorn/.virtualenvs/env7/bin/activate_this.py'
	execfile(activate_this, dict(__file__=activate_this))

	sys.path.append(os.path.dirname(__file__))
	from base import app as application
	application.debug = True


Now, just go to the addresse where your application is supposed to run and check that everything works.

In case something is wrong, first check the apache log.

	jeremydagorn@ssh:~$ cd ~/admin/log/
	jeremydagorn@ssh:~/admin/log$ ls
	2011  2012  2013  2014  access.log  error.log

The error should be easy to spot in `error.log`


#### Troubleshooting ####
----------------------------------------

##### 1. How can I use basic http authentication in production? #####

Basic http auth is easy to use in flask. Nevertheless, there is an option in Apache not set by default. This option will prevent apache to consume the required headers, meaning that nothing will be sent to your application.

To prevent this just create an `.htaccess` in your repo and add the following line:

	WSGIPassAuthorization On

##### 2. How can I debug if something goes wrong with mod_wsgi configuration? #####

Check [this page](https://code.google.com/p/modwsgi/wiki/DebuggingTechniques#Tracking_Request_and_Response) and copy/paste the class LoggingMiddleware in your `app.wsgi`. You will be able to see the request and response sent in your error.log apache file.


#####  3. pip is not able to install my requirement as it does not find anything related to it. How do I install my dependency? #####

If you get something like the following:

	Could not find any downloads that satisfy the requirement <requirement> in /usr/local/lib/python2.7/dist-packages
	Some externally hosted files were ignored (use --allow-external spyder to allow).

	No distributions at all found for ...

Check your version of pip. If your version is 1.5 or more, it could be related to the fact the pip no longer respects dependency links by default.

You can then either use the `--process-dependency-links` when installing your dependency, or, what worked for me:

	pip install -U --allow-external twill --allow-unverified twill twill


#####  4. How do I use python packages not installed in my virtual environment? #####

Alwaysdata has some [documentation](https://help.alwaysdata.com/languages/python/environment) explaining how to install python modules. In my case, it was to install lxml. I installed it using easy_install.
If you follow the alwaysdata documentation correctly, it will be as easy as adding a new line there:

	ALLDIRS = ['/home/jeremydagorn/.virtualenvs/env7/lib/python2.7/site-packages', "<folder_where_your_package_is_installed"]


### Conclusion ###

I hope this helps. It might not contain enough explanations, or contains wrong formulations. Let me know what you think about this, either on my twitter, or by leaving a comment directly on my github.

A french version of this article is available [here](https://gist.github.com/jrm2k6/8968297).


### Some of the references which helped me. ###

- [Setting up python/pip](http://forum.alwaysdata.com/viewtopic.php?id=3965)
- [Virtual envs and mod_wsgi](https://code.google.com/p/modwsgi/wiki/VirtualEnvironments)
- [mod_wsgi & debugging techniques](https://code.google.com/p/modwsgi/wiki/DebuggingTechniques#Tracking_Request_and_Response)
- [WSGIPathAuthorization](https://code.google.com/p/modwsgi/wiki/ConfigurationDirectives#WSGIPassAuthorization)
- [Flask documentation](http://flask.pocoo.org/snippets/8/)
