# React Flow Smart Edge

Special Edge for [React Flow](https://github.com/wbkd/react-flow) that never intersects with other nodes.

![Smart Edge](https://raw.githubusercontent.com/tisoap/react-flow-smart-edge/main/.github/images/example.gif)

## Install

```bash
npm install @tisoap/react-flow-smart-edge
```

## Usage

```jsx
import React from 'react';
import ReactFlow from 'react-flow-renderer';
import { SmartEdge } from '@tisoap/react-flow-smart-edge';

const elements = [
  {
    id: '1',
    data: { label: 'Node 1' },
    position: { x: 300, y: 100 },
  },
  {
    id: '2',
    data: { label: 'Node 2' },
    position: { x: 300, y: 200 },
  },
  {
    id: 'e21',
    source: '2',
    target: '1',
    type: 'smart',
  },
];

export const Graph = (props) => {
  const { children, ...rest } = props;

  return (
    <ReactFlow
      elements={elements}
      edgeTypes={{
        smart: SmartEdge,
      }}
      {...rest}
    >
      {children}
    </ReactFlow>
  );
};
```

## Options

The `SmartEdge` takes the same options as a [React Flow Edge](https://reactflow.dev/docs/api/edges/).

You can configure additional options wrapping your graph with `SmartEdgeProvider` and passing an options `value`. The available options are:

```js
const options = {
  // Configure by how many milliseconds the Edge render should be debounced, default 200, pass 0 to disable.
  debounceTime: 100,
};
```

Usage:

```jsx
import React from 'react';
import ReactFlow from 'react-flow-renderer';
import { SmartEdge, SmartEdgeProvider } from '@tisoap/react-flow-smart-edge';
import elements from './elements';

export const Graph = (props) => {
  const { children, ...rest } = props;

  return (
    <SmartEdgeProvider value={{ debounceTime: 300 }}>
      <ReactFlow
        elements={elements}
        edgeTypes={{
          smart: SmartEdge,
        }}
        {...rest}
      >
        {children}
      </ReactFlow>
    </SmartEdgeProvider>
  );
};
```

## Example

There is a minimum example in this repository [`example` folder](https://github.com/tisoap/react-flow-smart-edge/tree/main/example). Clone this repository and run `yarn; cd example; yarn; yarn start`.

you can also see the Storybook examples or interact with the stories yourself by cloning this repository and running `yarn; yarn storybook`.

## License

This project is [MIT](https://github.com/tisoap/react-flow-smart-edge/blob/main/LICENSE) licensed.

### Support

Liked this project and want to show your support? Buy me a coffee:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/J3J472RAJ)
