import Panel from './Panel';

export default function PanelCaption(props) {
    return (
        <Panel title="Caption" defaultOpen={props.defaultOpen}>
            <div className="panel-content">
                <p>....</p>
            </div>
        </Panel>
    );
}