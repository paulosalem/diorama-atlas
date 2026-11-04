using System;
using System.Runtime.InteropServices;
using UnityEngine;

[Serializable] public class StudyView {
    public float[] position;
    public float[] target;
    public float fov;
}

public class StudyRuntime : MonoBehaviour {
    public Camera viewCamera;
    public Material water;
    public int patinaMaterials;
    public int windMaterials;
    public int instances;
    private Quaternion baseRotation;
    private Vector2 angles;
    private Vector3 pointer;
    private bool paused;
    private float clock;
    private float sampleTime;
    private int frames;
    private int meshCount;
    private int animationCount;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void ReportStudyFrame(float fps, float animationTime, int meshes, int animations, int patinaMaterials, int instances, int windMaterials);
#endif

    void Start() {
        meshCount = FindObjectsByType<Renderer>(FindObjectsSortMode.None).Length;
        foreach (var animator in FindObjectsByType<Animator>(FindObjectsSortMode.None))
            animationCount += animator.runtimeAnimatorController.animationClips.Length;
        animationCount += windMaterials + (instances > 0 ? 1 : 0);
    }

    public void SetView(string json) {
        var view = JsonUtility.FromJson<StudyView>(json);
        viewCamera.transform.position = Convert(view.position);
        viewCamera.transform.LookAt(Convert(view.target));
        viewCamera.fieldOfView = view.fov;
        baseRotation = viewCamera.transform.rotation;
        angles = Vector2.zero;
    }

    public static Vector3 Convert(float[] value) {
        return new Vector3(-value[0], value[1], value[2]);
    }

    public void SetPaused(string value) {
        paused = value == "true";
        Time.timeScale = paused ? 0 : 1;
    }

    void Update() {
        if (!paused) clock += Time.unscaledDeltaTime;
        if (water != null) water.SetFloat("_StudyTime", clock);
        Shader.SetGlobalFloat("_StudyClock", clock);
        if (Input.GetMouseButtonDown(0)) pointer = Input.mousePosition;
        if (Input.GetMouseButton(0)) {
            var delta = Input.mousePosition - pointer;
            angles.x += delta.x * .17f;
            angles.y = Mathf.Clamp(angles.y - delta.y * .17f, -75, 75);
            pointer = Input.mousePosition;
            viewCamera.transform.rotation = baseRotation * Quaternion.Euler(angles.y, angles.x, 0);
        }
        float yaw = (Input.GetKey(KeyCode.RightArrow) ? 1 : 0) - (Input.GetKey(KeyCode.LeftArrow) ? 1 : 0);
        float pitch = (Input.GetKey(KeyCode.DownArrow) ? 1 : 0) - (Input.GetKey(KeyCode.UpArrow) ? 1 : 0);
        if (yaw != 0 || pitch != 0) {
            angles.x += yaw * Time.unscaledDeltaTime * 35;
            angles.y = Mathf.Clamp(angles.y + pitch * Time.unscaledDeltaTime * 35, -75, 75);
            viewCamera.transform.rotation = baseRotation * Quaternion.Euler(angles.y, angles.x, 0);
        }
        frames++;
        sampleTime += Time.unscaledDeltaTime;
        if (sampleTime >= 1) {
#if UNITY_WEBGL && !UNITY_EDITOR
            ReportStudyFrame(frames / sampleTime, clock, meshCount, animationCount, patinaMaterials, instances, windMaterials);
#endif
            frames = 0;
            sampleTime = 0;
        }
    }
}
