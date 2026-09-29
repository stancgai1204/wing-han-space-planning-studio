# Reference image library

Store permanent inspiration images in room folders under this directory.

For example, place karaoke images in `karaoke/`, then add each image to
`manifest.json`:

```json
{
  "layoutIdea": {
    "file": "layout-ideas/option-a.jpg",
    "title": "Layout option A"
  },
  "references": [
    {
      "room": "Karaoke",
      "file": "karaoke/lounge-reference-01.jpg",
      "title": "Karaoke lounge reference"
    }
  ]
}
```

Files listed in the manifest appear automatically in the website gallery and
remain available after the project is published to GitHub Pages.
