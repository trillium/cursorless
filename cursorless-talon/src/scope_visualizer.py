from talon import Module, actions

mod = Module()
mod.list("cursorless_show_scope_visualizer", desc="Show scope visualizer")
mod.list("cursorless_hide_scope_visualizer", desc="Hide scope visualizer")
mod.list(
    "cursorless_visualization_type",
    desc='Cursorless visualization type, e.g. "removal" or "iteration"',
)


@mod.action_class
class Actions:
    def private_cursorless_show_scope_visualizer(
        scope_type: dict,  # pyright: ignore [reportGeneralTypeIssues]
        visualization_type: str,
    ):
        """Shows scope visualizer"""
        actions.user.private_cursorless_run_rpc_command_no_wait(
            "cursorless.showScopeVisualizer", scope_type, visualization_type
        )

    def private_cursorless_hide_scope_visualizer():
        """Hides scope visualizer"""
        actions.user.private_cursorless_run_rpc_command_no_wait(
            "cursorless.hideScopeVisualizer"
        )

    def private_cursorless_show_that_mark(
        mark: dict,  # pyright: ignore [reportGeneralTypeIssues]
    ):
        """Shows highlighting for a simple mark (e.g. 'that')"""
        mark_type = mark.get("type")
        if mark_type == "that":
            actions.user.private_cursorless_run_rpc_command_no_wait(
                "cursorless.showThatMark"
            )

    def private_cursorless_hide_that_mark(
        mark: dict,  # pyright: ignore [reportGeneralTypeIssues]
    ):
        """Hides highlighting for a simple mark (e.g. 'that')"""
        mark_type = mark.get("type")
        if mark_type == "that":
            actions.user.private_cursorless_run_rpc_command_no_wait(
                "cursorless.hideThatMark"
            )
