import subprocess, os
os.makedirs('tutorial/install_frames', exist_ok=True)
subprocess.run([
    'ffmpeg', '-y', '-i', 'tutorial/2.mp4',
    '-vf', 'fps=1/2,scale=640:-1',
    '-q:v', '2',
    'tutorial/install_frames/frame_%03d.jpg'
], check=True, capture_output=True)
print('Frames:', len(os.listdir('tutorial/install_frames')))
