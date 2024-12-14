const RunTimeTest = ({
	index,
	label = "RunTimeTest",
}: {
	index: number;
	label?: string;
}) => {
	const date = Date.now();
	console.log(label, index, date);
	return null;
};
export default RunTimeTest;
