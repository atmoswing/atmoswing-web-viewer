import Panel from './Panel';

export default function PanelDisplay(props) {
    return (
        <Panel title="Display" defaultOpen={props.defaultOpen}>
            <div className="panel-content">
                <p>....</p>
            </div>
        </Panel>
    );
}