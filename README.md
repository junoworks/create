# junoworks/create

CLI tool to scaffold Juno projects.

## Usage

```bash
npx github:junoworks/create <export-id> [folder-name]
```

### Examples

```bash
# Download and extract a Juno project
npx github:junoworks/create quickly-light-mouse

# Specify a custom folder name
npx github:junoworks/create quickly-light-mouse my-awesome-app
```

## What is Juno?

Juno is a visual web application prototyping and design tool. It allows you to build web applications
visually using a drag-and-drop interface, design multiple pages/frames, edit component properties, apply themes, and export code.

## How it works

1. Create your project in [Juno](https://junodesign.app)
2. Export your project (this generates a unique export ID)
3. Use `npx github:junoworks/create <export-id>` to download and scaffold the project
4. Open it in your IDE or task your AI agent to start building!
