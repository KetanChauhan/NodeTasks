class DataQuery{

    //task
    static GET_ALL_TASKS = `SELECT * 
    FROM task ts 
    LEFT JOIN (SELECT taskid, array_to_string(array_agg(tagid), ',') as tags from task_tag_map GROUP BY taskid) tt 
    ON ts.id=tt.taskid 
    ORDER BY ts.id`;
    static TASK_BY_ID = `SELECT * 
    FROM task ts 
    LEFT JOIN (SELECT taskid, array_to_string(array_agg(tagid), ',') as tags from task_tag_map GROUP BY taskid) tt 
    ON ts.id=tt.taskid 
    WHERE id = $1
    ORDER BY ts.id`;
    
    static INSERT_TASK = `INSERT INTO task(name,isdone,createdon,modifiedon) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`;

    static UPDATE_TASK = `UPDATE task SET name=$1, isdone=$2, modifiedon=CURRENT_TIMESTAMP WHERE id=$3`;

    static DELETE_TASK = `DELETE FROM task WHERE id=$1`;

    //tag
    static GET_ALL_TAGS = `SELECT * FROM tag ORDER BY id`;
    static TAG_BY_ID = `SELECT * FROM tag WHERE id = $1`;

    static INSERT_TAG = `INSERT INTO tag(name,color,createdon,modifiedon) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`;

    static UPDATE_TAG = `UPDATE tag SET name=$1, color=$2, modifiedon=CURRENT_TIMESTAMP WHERE id=$3`;

    static DELETE_TAG = `DELETE FROM tag WHERE id=$1`;

    //task tag map
    static INSERT_TAG_OF_TASK = `INSERT INTO task_tag_map(taskid,tagid) VALUES `;

    static DELETE_TAG_OF_TASK = `DELETE FROM task_tag_map WHERE taskid=$1`;
}

module.exports = { DataQuery }