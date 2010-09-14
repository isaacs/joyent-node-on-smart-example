
# Installing a Node service on a Joyent SmartMachine

This article will teach you how to get up and running with [NodeJS](http://nodejs.org/)
on a regular Solaris SmartMachine from [Joyent](http://www.joyent.com/)

To make things a bit simpler, we're just going to create a server that does
nothing but the normal `Hello World!` web server.

This article's content and the code samples are also available
[on Github](http://github.com/isaacs/joyent-node-on-smart-example).  If you prefer to
follow along at home with the git repo handy, be my guest:

    git clone http://github.com/isaacs/joyent-node-on-smart-example.git

It'll save a bit of wgetting and curling.

## Step 1: Get Your SmartMachine

Head on over to [Joyent](http://my.joyent.com/) and provision
yourself up a shiny new SmartMachine.  I got mine at <http://8.19.35.165/>.
To make this a bit easier, I set up a variable in my bash session so that I wouldn't
have to keep typing that.

    export smart=8.19.35.165

When your SmartMachine gets created, you'll get an email with a bunch of passwords.
You'll probably want to [change those](http://wiki.joyent.com/smartmachine:change-passwords).

I personally like to send my pubkeys so I don't have to enter the
password every time, but that's up to you:

    scp ~/.ssh/*.pub admin@$smart:~/.ssh/

Everything that we'll be doing from here on out will be on the SmartMachine,
so sign in:

    ssh admin@$smart

Change the root password to something crazy:

    sudo passwd root

Change the admin password while you're in there:

    passwd

## Installing node and npm

Make sure that `~/local/bin` is in your `$PATH`.  That's where we'll be
installing things, so that we don't have to use sudo.

    echo 'export PATH=$HOME/local/bin:${PATH}' >> ~/.bashrc

Install node:

    mkdir node
    cd node
    curl http://nodejs.org/dist/node-latest.tar.gz | gtar xz --strip 1
    ./configure --prefix=$HOME/local && make install

This will download node and install it into the `~/local/bin` folder.

Because Solaris has a slightly different `tar` program, and npm expects the
GNU-compatible version, we'll set that as a config option ahead of time:

    echo tar = gtar > ~/.npmrc

You could also set the `TAR` environ, just like you set the `PATH` above, but
this way won't affect any other programs.

At this point, npm will work by default, without requiring any special
privileges.  Go ahead and bootstrap it:

    curl http://npmjs.org/install.sh | sh

Now you should be able to run npm, use the node repl, etc.  While we aren't
going to be using npm in this demo, it's super handy to have it there if you
want to install any of the popular node libraries.

## Cleanup

We're going to be installing a node web server on port 80, so if your
SmartMachine has Apache or Nginx pre-installed, we'll have to disable those
so that they don't get in the way.

If that's the case, run these commands to turn off those other servers:

    svcadm disable apache
    svcadm disable nginx

## The `Hello, world!` program

For demonstration purposes, we'll just write a little hello world program.

First, create a folder where our program is going to live:

    mkdir hello-world

You can grab the file itself from
[the github repo](http://github.com/isaacs/joyent-node-on-smart-example/raw/master/server.js),
or probably just crank it out from memory if you've been messing around with node
long enough:

    require("http").createServer(function (req, res) {
      res.writeHead(200, {})
      res.end("Hello, world!")
    }).listen(80)
    console.log("waiting to say hello.")

(Feel free to get a little more creative with it.)

Save that to `~/hello-world/server.js`.

## Pause for Reflection

Let's make sure everything is kosher at this point.

    $ which node
    /home/admin/local/bin/node
    
    $ sudo node hello-world/server.js
    Password:
    waiting to say hello.

Then hit your SmartMachine URL and make sure it says `Hello, world!`

If anything is broken, now's the time to fix it, because we're about to
dive into Solaris service land.

## Define the Service

"Services" in Solaris are first-class citizens in the OS.  Each service has an
XML manifest file that defines it.  The `svccfg` command is used to add one of these
config files to the system, and `svcadm` is used to administrate
services once they're defined.

I went ahead and created a
[node-hello-world-service-manifest.xml](http://github.com/isaacs/joyent-node-on-smart-example/raw/master/node-hello-world-service-manifest.xml)
file for this purpose.  So, download that, and add it to the system configuration:

    wget http://github.com/isaacs/joyent-node-on-smart-example/raw/master/node-hello-world-service-manifest.xml
    svccfg import node-hello-world-service-manifest.xml

If you've cloned the [git repo](http://github.com/isaacs/joyent-node-on-smart-example),
then you can of course `svccfg` it from there, instead.

It's outside the scope of this article to go through all the different settings and what
they do.  Most are pretty self-explanatory (folder paths and such).  For more info than
you ever wanted to know about smf template files, see `man 5 smf_template`.

## Start the Service

Starting a service is a simple one-liner:

    svcadm enable node-hello-world-service

To stop the service is also predictably simple:

    svcadm disable node-hello-world-service

Once you get tired of stopping and starting the service, start it one last time,
and then [load up your SmartMachine URL in a web browser](http://8.19.35.165/).
If it says `Hello, world!`, then congratulations, you're done!  You can quit while
you're ahead, or read on to learn a few tricks you can use when it breaks.

## Troubleshooting

The services in Solaris each have a log file based on the name that they're defined
with.  For ours, the log file lives at `/var/svc/log/site-node-hello-world-service:default.log`.
If something doesn't work right, you can view the last few log messages like this:

    tail -n 50 "/var/svc/log/site-node-hello-world-service:default.log"

Solaris will give it a reasonable try to restart your service if it crashes, which is
a really nice feature.  But, if it keeps crashing, it'll give up, and put the service
into "maintenance" mode.

For instance, if the server can't be started, you might see a bunch of log messages
that look like this:

    ...
    [ Sep 14 00:55:56 Stopping because all processes in service exited. ]
    [ Sep 14 00:55:56 Executing start method ("/home/admin/local/bin/node /home/admin/hello-world/server.js"). ]
    [ Sep 14 00:55:56 Stopping because all processes in service exited. ]
    [ Sep 14 00:55:56 Executing start method ("/home/admin/local/bin/node /home/admin/hello-world/server.js"). ]
    [ Sep 14 00:55:56 Stopping because all processes in service exited. ]
    [ Sep 14 00:55:56 Executing start method ("/home/admin/local/bin/node /home/admin/hello-world/server.js"). ]
    [ Sep 14 00:55:56 Stopping because all processes in service exited. ]
    [ Sep 14 00:55:56 Restarting too quickly, changing state to maintenance. ]

If this happens, first of all, make sure that the site will start up if you do it
manually.  This will uncover most problems.

    sudo /home/admin/local/bin/node /home/admin/hello-world/server.js

The `sudo` is required because we're listening on port 80.

You can also get information about a service by using the `svcs` command.  For
example, if our site thrashes itself into maintenance mode, you might see this:

    $ svcs -lp node-hello-world-service
    fmri         svc:/site/node-hello-world-service:default
    name         node.js hello-world service
    enabled      true
    state        maintenance
    next_state   none
    state_time   September 13, 2010  5:55:56 PM PDT
    logfile      /var/svc/log/site-node-hello-world-service:default.log
    restarter    svc:/system/svc/restarter:default
    contract_id  
    dependency   require_all/refresh svc:/milestone/network:default (online)
    dependency   require_all/refresh svc:/system/filesystem/local (online)

Once you've fixed whatever was preventing the site from starting properly,
you can restart it by doing the following:

    svcadm disable node-hello-world-service
    svcadm enable node-hello-world-service

Note that once you go into maintenance mode, your service must be disabled
before it can be re-enabled.

At this point, the logs should look like this:

    $ tail -5 /var/svc/log/site-node-hello-world-service\:default.log 
    [ Sep 14 00:55:56 Restarting too quickly, changing state to maintenance. ]
    [ Sep 14 01:09:04 Leaving maintenance because disable requested. ]
    [ Sep 14 01:09:04 Disabled. ]
    [ Sep 14 01:09:07 Enabled. ]
    [ Sep 14 01:09:07 Executing start method ("/home/admin/local/bin/node /home/admin/hello-world/server.js"). ]

And hitting the site in a web browser or `curl http://127.0.0.1/` should
show it working.

