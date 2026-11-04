@echo off
rem koino/windows/koino.cmd
rem A koino inditasa Windowson (az indit.ps1 hivasa) - argumentummal a program parancsa: koino.cmd ter, koino.cmd belep.
rem Csak ASCII: a cmd a parancsfajlt a konzol kodlapjan olvassa.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0indit.ps1" %*
