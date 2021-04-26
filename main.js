const { app, BrowserWindow, Menu, Tray, shell, dialog, clipboard, globalShortcut } = require("electron")
const { exec } = require("child_process")
const AutoLaunch = require("auto-launch")
const { is } = require("electron-util")
const debug = require("electron-debug")
const electron = require("electron")
const fetch = require("node-fetch")
const path = require("path")
const fs = require("fs")
const os = require("os")
const ipc = electron.ipcMain

// ?  init
let window_splash
let window_landing
let window_confirm
let window_application
let window_settings
let window_import
let window_export

let confirm_shown = false
let application_shown = false
let settings_shown = false
let import_shown = false
let export_shown = false

let ipc_to_confirm = false
let ipc_to_application_0 = false
let ipc_to_application_1 = false

let confirmed = false
let startup = false
let offline = false
let shortcuts = false

let to_tray = false
let show_tray = false
let pass_start = false
let update_start = false

// ? version
const authme_version = "2.4.0"
const tag_name = "2.4.0"
const release_date = "2021. April 27."
const update_type = "Standard update"

ipc.on("ver", (event, data) => {
	event.returnValue = { authme_version, release_date }
})

const v8_version = process.versions.v8
const node_version = process.versions.node
const chrome_version = process.versions.chrome
const electron_version = process.versions.electron

const os_version = `${os.type()} ${os.arch()} ${os.release()}`

let python_version

// eslint-disable-next-line
exec('python -c "import platform; print(platform.python_version())"', (err, stdout, stderr) => {
	if (err) {
		console.log(err)
	}

	python_version = stdout

	if (python_version === undefined) {
		python_version = "Not installed"
	}
})

// ? development
let dev

if (is.development === true) {
	setTimeout(() => {
		window_application.setTitle("Authme Dev")
	}, 2500)

	// dev tools
	debug({
		showDevTools: false,
	})

	dev = true
}

// ? folders
let folder

// choose platform
if (process.platform === "win32") {
	folder = process.env.APPDATA
} else {
	folder = process.env.HOME
}

// init folders
const full_path = path.join(folder, "Levminer")
const file_path = dev ? path.join(folder, "Levminer/Authme Dev") : path.join(folder, "Levminer/Authme")

// check if folders exists
if (!fs.existsSync(full_path)) {
	fs.mkdirSync(path.join(full_path))
}
if (!fs.existsSync(file_path)) {
	fs.mkdirSync(file_path)
}

// ? settings
const settings = `{
		"version":{
			"tag": "${tag_name}"  
		},

		"settings": {
			"launch_on_startup": false,
			"close_to_tray": false,
			"show_2fa_names": false,
			"click_to_reveal": false,
			"reset_after_copy": true,
			"save_search_results": true
		},

		"security": {
			"require_password": null,
			"password": null
		},

		"shortcuts": {
			"show": "CommandOrControl+q",
			"settings": "CommandOrControl+s",
			"exit": "CommandOrControl+w",
			"web": "CommandOrControl+b",
			"import": "CommandOrControl+i",
			"export": "CommandOrControl+e",
			"release": "CommandOrControl+n",
			"issues": "CommandOrControl+p",
			"docs": "CommandOrControl+d",
			"licenses": "CommandOrControl+l",
			"update": "CommandOrControl+u",
			"info": "CommandOrControl+o"
		},

		"global_shortcuts": {
			"show": "CommandOrControl+Shift+a",
			"settings": "CommandOrControl+Shift+s",
			"exit": "CommandOrControl+Shift+d"
		},

		"search_history": {
			"latest": null
		}
	}`

// create settings if not exists
if (!fs.existsSync(path.join(file_path, "settings.json"))) {
	fs.writeFileSync(path.join(file_path, "settings.json"), settings, (err) => {
		if (err) {
			return console.log(`error creating settings.json ${err}`)
		} else {
			return console.log("settings.json created")
		}
	})
}

// read settings
const file = JSON.parse(
	fs.readFileSync(path.join(file_path, "settings.json"), "utf-8", (err, data) => {
		if (err) {
			return console.log(`Error reading settings.json ${err}`)
		} else {
			return console.log("settings.json readed")
		}
	})
)

// ? install protbuf
const spawn = require("child_process").spawn

const src = "src/install.py"

const py = spawn("python", [src])

// ? open tray
const tray_show = () => {
	const toggle = () => {
		if (confirmed == false) {
			if (pass_start == true) {
				if (confirm_shown == false) {
					window_confirm.maximize()
					window_confirm.show()

					confirm_shown = true
				} else {
					window_confirm.hide()

					confirm_shown = false
				}
			}
		}

		if (application_shown == false) {
			// if password and password confirmed
			if (if_pass == true && confirmed == true) {
				window_application.maximize()
				window_application.show()

				application_shown = true
			}

			// if no password
			if (if_nopass == true) {
				window_application.maximize()
				window_application.show()

				application_shown = true
			}

			// if exit to tray on
			if (show_tray == true) {
				window_application.maximize()
				window_application.show()

				application_shown = true
			}
		} else {
			// if password and password confirmed
			if (if_pass == true && confirmed == true) {
				window_application.hide()

				application_shown = false
			}

			// if no password
			if (if_nopass == true) {
				window_application.hide()

				application_shown = false
			}

			// if exit to tray on
			if (show_tray == true) {
				window_application.hide()

				application_shown = false
			}
		}
	}

	// ? check for required password
	let if_pass = false
	let if_nopass = false

	if (file.security.require_password == true) {
		if_pass = true
		pass_start = true

		toggle()
	} else {
		if_nopass = true

		toggle()
	}
}

// ? tray settings
const tray_settings = () => {
	const toggle = () => {
		if (settings_shown == false) {
			if (if_pass == true && confirmed == true) {
				window_settings.maximize()
				window_settings.show()

				settings_shown = true
			}

			if (if_nopass == true) {
				window_settings.maximize()
				window_settings.show()

				settings_shown = true
			}
		} else {
			if (if_pass == true && confirmed == true) {
				window_settings.hide()

				settings_shown = false
			}

			if (if_nopass == true) {
				window_settings.hide()

				settings_shown = false
			}
		}
	}

	let if_pass = false
	let if_nopass = false

	// check if require password
	if (file.security.require_password == true) {
		if_pass = true
		pass_start = true

		toggle()
	} else {
		if_nopass = true

		toggle()
	}
}

// tray exit
const tray_exit = () => {
	to_tray = false
	app.exit()
}

// ? create window
const createWindow = () => {
	window_landing = new BrowserWindow({
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		backgroundColor: "#141414",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
		},
	})

	window_confirm = new BrowserWindow({
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		backgroundColor: "#141414",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
		},
	})

	window_application = new BrowserWindow({
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		backgroundColor: "#141414",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
		},
	})

	window_settings = new BrowserWindow({
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		backgroundColor: "#141414",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
		},
	})

	window_import = new BrowserWindow({
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		backgroundColor: "#141414",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
		},
	})

	window_export = new BrowserWindow({
		width: 1900,
		height: 1000,
		minWidth: 1000,
		minHeight: 600,
		show: false,
		backgroundColor: "#141414",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
		},
	})

	window_landing.loadFile("./app/landing/index.html")
	window_confirm.loadFile("./app/confirm/index.html")
	window_application.loadFile("./app/application/index.html")
	window_settings.loadFile("./app/settings/index.html")
	window_import.loadFile("./app/import/index.html")
	window_export.loadFile("./app/export/index.html")

	if (file.security.require_password == null) {
		window_landing.maximize()
	}

	window_application.on("show", () => {
		window_application.webContents.executeJavaScript("focus_search()")
	})

	window_landing.on("close", () => {
		app.quit()
	})

	window_confirm.on("close", () => {
		app.quit()
	})

	window_application.on("close", async (event) => {
		if (to_tray == false) {
			app.exit()
		} else {
			event.preventDefault()
			setTimeout(() => {
				window_application.hide()
			}, 100)

			show_tray = true

			application_shown = false
		}
	})

	window_settings.on("close", async (event) => {
		if (dev === true) {
			app.exit()
		} else {
			event.preventDefault()
			setTimeout(() => {
				window_settings.hide()
			}, 100)
			show_tray = true

			settings_shown = false
		}
	})

	window_import.on("close", async (event) => {
		if (dev === true) {
			app.exit()
		} else {
			event.preventDefault()
			setTimeout(() => {
				window_import.hide()
			}, 100)
			show_tray = true

			import_shown = false
		}
	})

	window_export.on("close", async (event) => {
		if (dev === true) {
			app.exit()
		} else {
			event.preventDefault()
			setTimeout(() => {
				window_export.hide()
			}, 100)
			show_tray = true

			export_shown = false
		}
	})

	// ? check for auto update
	window_application.on("show", () => {
		const api = async () => {
			try {
				await fetch("https://api.levminer.com/api/v1/authme/releases")
					.then((res) => res.json())
					.then((data) => {
						try {
							if (data.tag_name > tag_name && data.tag_name != undefined && data.prerelease != true) {
								dialog
									.showMessageBox({
										title: "Authme",
										buttons: ["Yes", "No"],
										defaultId: 0,
										cancelId: 1,
										type: "info",
										message: `
										Update available: Authme ${data.tag_name}
										
										Do you want to download it?
					
										You currently running: Authme ${tag_name}
										`,
									})
									.then((result) => {
										update = true

										if (result.response === 0) {
											shell.openExternal("https://github.com/Levminer/authme/releases/latest")
										}
									})
							}
						} catch (error) {
							return console.log(error)
						}
					})
			} catch (error) {
				return console.log(error)
			}
		}

		if (update_start == false) {
			api()

			update_start = true
		}
	})

	// ? global shortcuts
	if (file.global_shortcuts.show !== "None") {
		globalShortcut.register(file.global_shortcuts.show, () => {
			tray_show()
		})
	}

	if (file.global_shortcuts.settings !== "None") {
		globalShortcut.register(file.global_shortcuts.settings, () => {
			tray_settings()
		})
	}

	if (file.global_shortcuts.exit !== "None") {
		globalShortcut.register(file.global_shortcuts.exit, () => {
			tray_exit()
		})
	}
}

// ? init auto launch
const authme_launcher = new AutoLaunch({
	name: "Authme",
	path: app.getPath("exe"),
})

// ? ipcs

ipc.on("to_confirm", () => {
	if (ipc_to_confirm == false) {
		window_confirm.maximize()
		window_confirm.show()
		window_landing.hide()
		ipc_to_confirm = true
	}
})

ipc.on("to_application0", () => {
	if (ipc_to_application_0 == false && startup == false) {
		window_confirm.hide()

		setTimeout(() => {
			window_application.maximize()
			window_application.show()
		}, 300)

		ipc_to_application_0 = true

		confirmed = true
	}
})

ipc.on("to_application1", () => {
	if (ipc_to_application_1 == false && startup == false) {
		window_landing.hide()

		setTimeout(() => {
			window_application.maximize()
			window_application.show()
		}, 300)

		ipc_to_application_1 = true
	}
})

ipc.on("hide0", () => {
	if (settings_shown == false) {
		window_settings.maximize()
		window_settings.show()
		settings_shown = true
	} else {
		window_settings.hide()
		settings_shown = false
	}
})

ipc.on("hide1", () => {
	if (import_shown == false) {
		window_import.maximize()
		window_import.show()
		import_shown = true
	} else {
		window_import.hide()
		import_shown = false
	}
})

ipc.on("hide2", () => {
	if (export_shown == false) {
		window_export.maximize()
		window_export.show()
		export_shown = true
	} else {
		window_export.hide()
		export_shown = false
	}
})

ipc.on("after_startup0", () => {
	authme_launcher.disable()

	console.log("Startup disabled")
})

ipc.on("after_startup1", () => {
	authme_launcher.enable()

	console.log("Startup enabled")
})

ipc.on("after_tray0", () => {
	to_tray = false
})

ipc.on("after_tray1", () => {
	to_tray = true
})

ipc.on("startup", () => {
	window_application.hide()
	window_confirm.hide()
	startup = true
})

ipc.on("app_path", () => {
	shell.showItemInFolder(app.getPath("exe"))
})

ipc.on("about", () => {
	about()
})

ipc.on("abort", () => {
	dialog
		.showMessageBox({
			title: "Authme",
			buttons: ["Help", "Close"],
			type: "error",
			defaultId: 0,
			cancelId: 1,
			noLink: true,
			message: `
		Failed to check the integrity of the files.
		
		You or someone messed with the settings file, shutting down for security reasons!
		`,
		})
		.then((result) => {
			if (result.response === 0) {
				shell.openExternal("https://github.com/Levminer/authme/issues")
			} else if (result.response === 1) {
				app.exit()
			}
		})

	window_landing.destroy()
	window_application.destroy()
	window_settings.destroy()
	window_export.destroy()

	process.on("uncaughtException", (error) => {
		console.warn(`Authme - Execution aborted - ${error}`)
	})
})

ipc.on("offline", () => {
	if (offline === false) {
		setTimeout(() => {
			window_application.setTitle("Authme (Offline)")
			window_settings.setTitle("Authme (Offline)")
		}, 1000)
		offline = true
	} else {
		setTimeout(() => {
			window_application.setTitle("Authme")
			window_settings.setTitle("Authme ")
		}, 1000)
		offline = false
	}
})

// ? about
const about = () => {
	const message = `Authme: ${authme_version}\n\nV8: ${v8_version}\nNode: ${node_version}\nElectron: ${electron_version}\nChrome: ${chrome_version}\n\nOS version: ${os_version}\nPython version: ${python_version}\nRelease date: ${release_date}\nUpdate type: ${update_type}\n\nCreated by: Levminer\n`

	dialog
		.showMessageBox({
			title: "Authme",
			buttons: ["Copy", "Close"],
			defaultId: 0,
			cancelId: 1,
			noLink: true,
			type: "info",
			message: message,
		})
		.then((result) => {
			update = true

			if (result.response === 0) {
				clipboard.writeText(message)
			}
		})
}

// ? start app
app.whenReady().then(() => {
	process.on("uncaughtException", (error) => {
		console.log("Unknown error occurred", error.stack)

		dialog
			.showMessageBox({
				title: "Authme",
				buttons: ["Report", "Close"],
				defaultId: 0,
				cancelId: 1,
				noLink: true,
				type: "error",
				message: `Unknown error occurred! \n\n ${error.stack}`,
			})
			.then((result) => {
				update = true

				if (result.response === 0) {
					shell.openExternal("https://github.com/Levminer/authme/issues/")
				} else if (result.response === 1) {
					app.exit()
				}
			})
	})

	window_splash = new BrowserWindow({
		width: 500,
		height: 550,
		transparent: true,
		frame: false,
		alwaysOnTop: true,
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	})

	window_splash.loadFile("./app/splash/index.html")

	window_splash.show()

	if (is.development === true) {
		setTimeout(() => {
			createWindow()
		}, 1000)

		setTimeout(() => {
			window_splash.hide()
		}, 1500)
	} else {
		setTimeout(() => {
			createWindow()
		}, 2000)

		setTimeout(() => {
			window_splash.hide()
		}, 2500)
	}

	// make tray
	const iconpath = path.join(__dirname, "img/iconb.png")

	tray = new Tray(iconpath)

	tray.on("click", () => {
		tray_show()
	})

	const contextmenu = Menu.buildFromTemplate([
		{
			label: `Authme ${authme_version}`,
			enabled: false,
			icon: path.join(__dirname, "img/iconwsmall.png"),
		},
		{
			label: `(${release_date})`,
			enabled: false,
		},
		{ type: "separator" },
		{
			label: "Show app",
			accelerator: file.global_shortcuts.show,
			click: () => {
				tray_show()
			},
		},
		{ type: "separator" },
		{
			label: "Settings",
			accelerator: file.global_shortcuts.settings,
			click: () => {
				tray_settings()
			},
		},
		{ type: "separator" },
		{
			label: "Exit app",
			accelerator: file.global_shortcuts.exit,
			click: () => {
				tray_exit()
			},
		},
	])
	tray.setToolTip("Authme")
	tray.setContextMenu(contextmenu)

	const create_menu = () => {
		// menubar
		const template = [
			{
				label: "File",
				submenu: [
					{
						label: "Show app",
						accelerator: shortcuts ? "" : file.shortcuts.show,
						click: () => {
							tray_show()
						},
					},
					{
						type: "separator",
					},
					{
						label: "Settings",
						accelerator: shortcuts ? "" : file.shortcuts.settings,
						click: () => {
							const toggle = () => {
								if (settings_shown == false) {
									if (if_pass == true && confirmed == true) {
										window_settings.maximize()
										window_settings.show()

										settings_shown = true
									}

									if (if_nopass == true) {
										window_settings.maximize()
										window_settings.show()

										settings_shown = true
									}
								} else {
									if (if_pass == true && confirmed == true) {
										window_settings.hide()

										settings_shown = false
									}

									if (if_nopass == true) {
										window_settings.hide()

										settings_shown = false
									}
								}
							}

							let if_pass = false
							let if_nopass = false

							// check if require password
							if (file.security.require_password == true) {
								if_pass = true
								pass_start = true

								toggle()
							} else {
								if_nopass = true

								toggle()
							}
						},
					},
					{
						type: "separator",
					},
					{
						label: "Exit",
						accelerator: shortcuts ? "" : file.shortcuts.exit,
						click: () => {
							to_tray = false
							app.exit()
						},
					},
				],
			},
			{
				label: "Advanced",
				submenu: [
					{
						label: "Authme Web",
						accelerator: shortcuts ? "" : file.shortcuts.web,
						click: () => {
							shell.openExternal("https://web.authme.levminer.com")
						},
					},
					{
						type: "separator",
					},
					{
						label: "Import",
						accelerator: shortcuts ? "" : file.shortcuts.import,
						click: () => {
							const toggle = () => {
								if (import_shown == false) {
									if (if_pass == true && confirmed == true) {
										window_import.maximize()
										window_import.show()

										import_shown = true
									}

									if (if_nopass == true) {
										window_import.maximize()
										window_import.show()

										import_shown = true
									}
								} else {
									if (if_pass == true && confirmed == true) {
										window_import.hide()

										import_shown = false
									}

									if (if_nopass == true) {
										window_import.hide()

										import_shown = false
									}
								}
							}

							let if_pass = false
							let if_nopass = false

							// check if require password
							if (file.security.require_password == true) {
								if_pass = true
								pass_start = true

								toggle()
							} else {
								if_nopass = true

								toggle()
							}
						},
					},
					{
						type: "separator",
					},
					{
						label: "Export",
						accelerator: shortcuts ? "" : file.shortcuts.export,
						click: () => {
							const toggle = () => {
								if (export_shown == false) {
									if (if_pass == true && confirmed == true) {
										window_export.maximize()
										window_export.show()

										export_shown = true
									}

									if (if_nopass == true) {
										window_export.maximize()
										window_export.show()

										export_shown = true
									}
								} else {
									if (if_pass == true && confirmed == true) {
										window_export.hide()

										export_shown = false
									}

									if (if_nopass == true) {
										window_export.hide()

										export_shown = false
									}
								}
							}

							let if_pass = false
							let if_nopass = false

							// check if require password
							if (file.security.require_password == true) {
								if_pass = true
								pass_start = true

								toggle()
							} else {
								if_nopass = true

								toggle()
							}
						},
					},
				],
			},
			{
				label: "Help",
				submenu: [
					{
						label: "Release notes",
						accelerator: shortcuts ? "" : file.shortcuts.release,
						click: () => {
							shell.openExternal("https://github.com/Levminer/authme/releases")
						},
					},
					{
						type: "separator",
					},
					{
						label: "Issues",
						accelerator: shortcuts ? "" : file.shortcuts.issues,
						click: () => {
							shell.openExternal("https://github.com/Levminer/authme/issues")
						},
					},
					{
						type: "separator",
					},
					{
						label: "Docs",
						accelerator: shortcuts ? "" : file.shortcuts.docs,
						click: () => {
							shell.openExternal("https://docs.authme.levminer.com")
						},
					},
				],
			},
			{
				label: "About",
				submenu: [
					{
						label: "Show licenses",
						accelerator: shortcuts ? "" : file.shortcuts.licenses,
						click: () => {
							shell.openExternal("https://authme.levminer.com/licenses.html")
						},
					},
					{
						type: "separator",
					},
					{
						label: "Update",
						accelerator: shortcuts ? "" : file.shortcuts.update,
						click: () => {
							const api = async () => {
								try {
									await fetch("https://api.levminer.com/api/v1/authme/releases")
										.then((res) => res.json())
										.then((data) => {
											try {
												if (data.tag_name > tag_name && data.tag_name != undefined && data.prerelease != true) {
													dialog
														.showMessageBox({
															title: "Authme",
															buttons: ["Yes", "No"],
															defaultId: 0,
															cancelId: 1,
															type: "info",
															message: `
														Update available: Authme ${data.tag_name}
														
														Do you want to download it?
									
														You currently running: Authme ${tag_name}
														`,
														})
														.then((result) => {
															update = true

															if (result.response === 0) {
																shell.openExternal("https://github.com/Levminer/authme/releases/latest")
															}
														})
												} else {
													dialog.showMessageBox({
														title: "Authme",
														buttons: ["Close"],
														defaultId: 0,
														cancelId: 1,
														type: "info",
														message: `
													No update available:
													
													You are running the latest version!
								
													You are currently running: Authme ${tag_name}
													`,
													})
												}
											} catch (error) {
												return console.log(error)
											}
										})
								} catch (error) {
									dialog.showMessageBox({
										title: "Authme",
										buttons: ["Close"],
										defaultId: 0,
										cancelId: 1,
										type: "info",
										message: `
									No update available:
									
									Can't connect to API, check your internet connection or the API status in the settings!
				
									You currently running: Authme ${tag_name}
									`,
									})
								}
							}

							api()
						},
					},
					{
						type: "separator",
					},
					{
						label: "Info",
						accelerator: shortcuts ? "" : file.shortcuts.info,
						click: () => {
							about()
						},
					},
				],
			},
		]

		const menu = Menu.buildFromTemplate(template)
		Menu.setApplicationMenu(menu)
	}

	create_menu()

	ipc.on("shortcuts", () => {
		if (shortcuts === false) {
			shortcuts = true

			globalShortcut.unregisterAll()

			create_menu()
		} else {
			shortcuts = false

			if (file.global_shortcuts.show !== "None") {
				globalShortcut.register(file.global_shortcuts.show, () => {
					tray_show()
				})
			}

			if (file.global_shortcuts.settings !== "None") {
				globalShortcut.register(file.global_shortcuts.settings, () => {
					tray_settings()
				})
			}

			if (file.global_shortcuts.exit !== "None") {
				globalShortcut.register(file.global_shortcuts.exit, () => {
					tray_exit()
				})
			}

			create_menu()
		}
	})
})
