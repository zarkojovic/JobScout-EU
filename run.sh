#!/bin/bash
# Default runner — delegates to Žarko's profile. See run-zarko.sh / run-eva.sh.
exec "$(dirname "$0")/run-zarko.sh"
