# action-docker-layer-caching

```yaml
name: CI

on: push

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: satackey/action-docker-layer-caching@v0.0
      with:
        repotag: amazon/aws-cli
        key: aws-cli-docker-image

    - run: docker pull amazon/aws-cli
    - run: docker run --rm -it amazon/aws-cli --version
```