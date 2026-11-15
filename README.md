# Price analogy forecaster

This program reads price cases from an input folder and writes one forecast file per case to an output folder. It compares the recent pattern of log prices with earlier patterns and uses the median move that followed the closest matches to estimate the next move.
The forecast consults the twelve past windows whose shapes match the recent past most closely, and the median of what followed those windows, shrunk by a factor of zero point six, sets the adjustment.

To run it locally with Node 22, set MAKEFUN_INPUT_DIR to a folder containing .in case files and MAKEFUN_OUTPUT_DIR to the folder for results, then invoke node main.ts.
