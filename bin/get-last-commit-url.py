#!/usr/bin/env python


import subprocess, sys


def main():
    output = subprocess.check_output('git log --no-merges -1 --pretty=oneline', shell=True)

    hash, title = output.split(' ', 1)

    try:
        from fabric.colors import blue
        sys.stderr.write(blue(title))
    except ImportError:
        try:
            subprocess.call(['tput', 'setaf', '4'])
            sys.stderr.write('%s' % title)
            subprocess.call(['tput', 'sgr0'])
        except:
            sys.stderr.write('%s' % title)

    sys.stdout.write('https://github.com/pculture/unisubs/commit/%s' % hash)

if __name__ == '__main__':
    main()
