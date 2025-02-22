import React, { memo, useRef, useState } from 'react'
// import { EdgeText, getSmoothStepPath, getEdgeCenter, EdgeSmoothStepProps } from 'react-flow-renderer'
import { EdgeText, getEdgeCenter, getSmoothStepPath } from 'react-flow-renderer'
import { createGrid, getBoundingBoxes, gridToGraphPoint } from '../functions'
import type {
	PointInfo,
	SVGDrawFunction,
	PathFindingFunction
} from '../functions'
import type { EdgeProps, Node, BezierEdge } from 'react-flow-renderer'

/**
 * Any valid Edge component from react-flow-renderer
 */
export type EdgeComponent = typeof BezierEdge

export type SmartEdgeOptions = {
	debounceTime: number
	nodePadding: number
	gridRatio: number
}

export type SmartEdgeAdvancedOptions = SmartEdgeOptions & {
	fallback: EdgeComponent
	drawEdge: SVGDrawFunction
	generatePath: PathFindingFunction
}

export interface PathFindingEdgeProps<T = unknown> extends EdgeProps<T> {
	storeNodes: Node<T>[]
	options: SmartEdgeAdvancedOptions
}

export const PathFindingEdge = memo((props: PathFindingEdgeProps) => {
	enum Position {
		Left = 'left',
		Top = 'top',
		Right = 'right',
		Bottom = 'bottom',
	}

	interface GetBezierPathParams {
		sourceX: number;
		sourceY: number;
		sourcePosition?: Position;
		targetX: number;
		targetY: number;
		targetPosition?: Position;
		curvature?: number;
	}
	
	interface GetControlWithCurvatureParams {
		pos: Position;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		c: number;
	}

	function calculateControlOffset(distance: number, curvature: number): number {
	if (distance >= 0) {
		return 0.5 * distance;
	} else {
		return curvature * 25 * Math.sqrt(-distance);
	}
	}
	
	function getControlWithCurvature({ pos, x1, y1, x2, y2, c }: GetControlWithCurvatureParams): [number, number] {
	let ctX: number, ctY: number;
	switch (pos) {
		case Position.Left:
		{
			ctX = x1 - calculateControlOffset(x1 - x2, c);
			ctY = y1;
		}
		break;
		case Position.Right:
		{
			ctX = x1 + calculateControlOffset(x2 - x1, c);
			ctY = y1;
		}
		break;
		case Position.Top:
		{
			ctX = x1;
			ctY = y1 - calculateControlOffset(y1 - y2, c);
		}
		break;
		case Position.Bottom:
		{
			ctX = x1;
			ctY = y1 + calculateControlOffset(y2 - y1, c);
		}
		break;
	}
	return [ctX, ctY];
	}

	function getBezierCenter({
		sourceX,
		sourceY,
		sourcePosition = Position.Bottom,
		targetX,
		targetY,
		targetPosition = Position.Top,
		curvature = 0.25,
	}: GetBezierPathParams): [number, number, number, number] {
		const [sourceControlX, sourceControlY] = getControlWithCurvature({
		pos: sourcePosition,
		x1: sourceX,
		y1: sourceY,
		x2: targetX,
		y2: targetY,
		c: curvature,
		});
		const [targetControlX, targetControlY] = getControlWithCurvature({
		pos: targetPosition,
		x1: targetX,
		y1: targetY,
		x2: sourceX,
		y2: sourceY,
		c: curvature,
		});
		// cubic bezier t=0.5 mid point, not the actual mid point, but easy to calculate
		// https://stackoverflow.com/questions/67516101/how-to-find-distance-mid-point-of-bezier-curve
		const centerX = sourceX * 0.125 + sourceControlX * 0.375 + targetControlX * 0.375 + targetX * 0.125;
		const centerY = sourceY * 0.125 + sourceControlY * 0.375 + targetControlY * 0.375 + targetY * 0.125;
		const xOffset = Math.abs(centerX - sourceX);
		const yOffset = Math.abs(centerY - sourceY);
		return [centerX, centerY, xOffset, yOffset];
	}
	const {
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
		style,
		storeNodes,
		label,
		labelStyle,
		labelShowBg,
		labelBgStyle,
		labelBgPadding,
		labelBgBorderRadius,
		markerEnd,
		markerStart,
		options
	} = props

	// @ts-expect-error
	const edgePath = getSmoothStepPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	})

	const foreignObjectWidth = 125
	const foreignObjectHeight = 50
	// @ts-expect-error
	const [edgeCenterX, edgeCenterY, offsetX, offsetY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
	// @ts-expect-error
	const [calculatedObjectHeight, setObjectHeight] = useState(foreignObjectHeight)
	const bodyRef = useRef(null)
	// @ts-expect-error
	const [centerX, centerY, osX, osY] = getBezierCenter({sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition})

	const {
		gridRatio,
		nodePadding,
		drawEdge,
		fallback: FallbackEdge,
		generatePath
	} = options

	const roundCoordinatesTo = gridRatio

	// We use the node's information to generate bounding boxes for them
	// and the graph
	const { graph, nodes } = getBoundingBoxes(
		storeNodes,
		nodePadding,
		roundCoordinatesTo
	)

	const source: PointInfo = {
		x: sourceX,
		y: sourceY,
		position: sourcePosition
	}

	const target: PointInfo = {
		x: targetX,
		y: targetY,
		position: targetPosition
	}

	// With this information, we can create a 2D grid representation of
	// our graph, that tells us where in the graph there is a "free" space or not
	const { grid, start, end } = createGrid(
		graph,
		nodes,
		source,
		target,
		gridRatio
	)

	// We then can use the grid representation to do pathfinding
	const { fullPath, smoothedPath } = generatePath(grid, start, end)

	/*
	Use the fallback Edge if no path was found.
	length = 0: no path was found
	length = 1: starting and ending points are the same
	length = 2: a single straight line from point A to point B
  */
	if (smoothedPath.length <= 2) {
		return <FallbackEdge {...props} />
	}

	// Here we convert the grid path to a sequence of graph coordinates.
	const graphPath = smoothedPath.map((gridPoint) => {
		const [x, y] = gridPoint
		const graphPoint = gridToGraphPoint(
			{ x, y },
			graph.xMin,
			graph.yMin,
			gridRatio
		)
		return [graphPoint.x, graphPoint.y]
	})

	// Finally, we can use the graph path to draw the edge
	const svgPathString = drawEdge(source, target, graphPath)

	// The Label, if any, should be placed in the middle of the path
	const [middleX, middleY] = fullPath[Math.floor(fullPath.length / 2)]
	const { x: labelX, y: labelY } = gridToGraphPoint(
		{ x: middleX, y: middleY },
		graph.xMin,
		graph.yMin,
		gridRatio
	)

	// @ts-expect-error
	const text = label ? (
		<EdgeText
			x = {labelX}
			y = {labelY}
			label={"abcde1234"}
			labelStyle={labelStyle}
			labelShowBg={labelShowBg}
			labelBgStyle={labelBgStyle}
			labelBgPadding={labelBgPadding}
			labelBgBorderRadius={labelBgBorderRadius}
		/>
	) : null

	// console.log("offsetX = ", offsetX)
	// console.log("offsetY = ", offsetY)
	// console.log("edgeCenterX = ", edgeCenterX)
	// console.log("edgeCenterY = ", edgeCenterY)
	
	return (
		<>
			<path
				style={style}
				className='react-flow__edge-path'
				d={svgPathString}
				markerEnd={markerEnd}
				markerStart={markerStart}
				
			/>
			<foreignObject
				width={foreignObjectWidth}
				height={calculatedObjectHeight}
				x={centerX - foreignObjectWidth}
				y={centerY - calculatedObjectHeight}
				className="edgebutton-foreignobject"
				requiredExtensions="http://www.w3.org/1999/xhtml"
			>
				<body
					className="w-100 h-100 d-flex align-items-center justify-content-center text-center zindex-tooltip px-4 rounded tw-text-gray-800"
					style={{ backgroundColor: "#FFCC00" }}
					ref={bodyRef}
				>
					{label}
				</body>
			</foreignObject>
			{/* {text} */}
		</>
		// <>
		// 	<path
		// 		id={id}
		// 		style={style}
		// 		className="react-flow__edge-path"
		// 		d={edgePath}
		// 		markerEnd={markerEnd}
		// 	/>
		// 	<foreignObject
		// 		width={foreignObjectWidth}
		// 		height={calculatedObjectHeight}
		// 		x={edgeCenterX - foreignObjectWidth / 2}
		// 		y={edgeCenterY - calculatedObjectHeight / 2}
		// 		className="edgebutton-foreignobject"
		// 		requiredExtensions="http://www.w3.org/1999/xhtml"
		// 	>
		// 		<body
		// 			className="w-100 h-100 d-flex align-items-center justify-content-center text-center zindex-tooltip px-4 rounded tw-text-gray-800"
		// 			style={{ backgroundColor: "#FFCC00" }}
		// 			ref={bodyRef}
		// 		>
		// 			{label}
		// 		</body>
		// 	</foreignObject>
		// </>
	)
})
PathFindingEdge.displayName = 'PathFindingEdge'
