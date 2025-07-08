
## Kanban Boards

[GitLab Boards](https://gitlab.pg.innopolis.university/m.krylov/scareerz/-/boards) - there're two boards: **Development** and **Acceptance criteria status.**  *GitLab does not provide seperate links for individual boards*

### **Acceptance criteria status (board)**

*Acceptance criteria status* is tracking board  feature *is running on local (developer) machine,*  *approved by other developers, deployed on server,*  or *needs fixing.*  Issues appear on this board if issues is not closed and have label representing

| Collumn name             | Criteria                                                   |
| -------------------------- | ------------------------------------------------------------ |
| Needs fixing             | Issue that represent bug that needs immediate fix<br />        |
| Deployed                 | Features that deployed on remote server                    |
| Approved                 | Feature reviewed by whole team and approved                |
| Running on local machine | Developer that worked on feature managed to run it locally |

### Development (board)

*Development* board is essentially a backlog. Has all *issues,*  collumns are sorted by issue priority via labels

| Collumn name                    | Criteria                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Needs fixing                    | Issue that represent bug that needs immediate fix                                      |
| In progress                     | Issues that are currently in work                                                      |
| Must implement (first priority) | Issues that represent PBI that is not currently in work but should be implemented ASAP |
| Nice to have (second priority)  | Issues that represent PBI that is not currently in work and can be not yet implemented |


## Git workflow

### Stable/unstable branches, branch managment

- The `main` branch is **stable** channel. We push to `main`only at the end of sprints.
- The `sprint-*` branches are **unstable** channel in which we create individual issue branches (i.e `iss-46`).
- After the issue is closed, respective **issue branch** gets merged into unstable channel (i.e `sprint-1`) and issue branch is deleted.
- `Main` and `sprint-*` branches are **protected**. We would use **code reviewes** for merge requests if this was an option on GitLab, but this feature is available only for Premium users, so we're forced to prohibit pushes on main branches and review mergres to these branches in person on team meetings

### Issues

- Issues are **created** via [templates](https://gitlab.pg.innopolis.university/m.krylov/scareerz/-/tree/main/.gitlab/issue_templates?ref_type=heads). The name of issue should be descriptive, but concise. It should be clear what feature is implemented under that issue
- Issues are **assigned** to team members in accordance to their competence or by self-assigning. There's no one person responsible for assigning team members to issues.
- Issue is generally **closed** when the person assigned to it says that is done. If other developers consider already closed issue as not finished - they create new issue and define individual aspects of issue that still needs work

# Code review, commiting, merge requests

- **Code reviewes** are performed on offline meeting with wholde team
- It is recomended to keep **commit messages** short, concise, and in English, although no one really enforces these rules
- **Merge requests** are mandatory for any merge to `main` and `sprint-*` branches, as they are protected, but there's no defined procedure for this

### GitGraph

![GitGraph Team 18 Workflow](assets/GitGraph%20Team%2018%20Workflow-20250705183424-pzz81go.png)

## Secrets managment

- No secret managment. We don't know it.
