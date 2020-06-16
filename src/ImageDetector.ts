import exec from 'actions-exec-listener'

export class ImageDetector {
  alreadyExistedImages: Set<string> = new Set()
  existingImages: Set<string> = new Set()
  registerAlreadyExistedImages(images: string[]) {
    images.forEach(this.alreadyExistedImages.add)
  }

  async getExistingImages(): Promise<string[]> {
    const ids = (await exec.exec(`docker`, `image ls -q`.split(' '))).stdoutStr.split(`\n`).filter(id => id !== ``)
    const repotags = (await exec.exec(`docker`, `image ls --format '{{ .Repository }}:{{ .Tag }}'`.split(' '))).stdoutStr.split(`\n`).filter(id => id !== `` || !id.includes(`<node>`));
    ([...ids, ...repotags]).forEach(this.existingImages.add)
    return Array.from(this.existingImages)
  }

  getImagesShouldSave(): string[] {
    const resultSet = new Set(this.existingImages.values())
    this.alreadyExistedImages.forEach(resultSet.delete)
    return Array.from(resultSet)
  }
}