export default function LoadingSharedInterview(){
  return (
    <div style={{display:'grid', placeItems:'center', minHeight:'100dvh'}}>
      <div style={{display:'grid', gap:12, justifyItems:'center'}}>
        <div style={{width:56, height:56, border:'5px solid #c9e4f9', borderTopColor:'#3294ff', borderRadius:'50%', animation:'spin 0.9s linear infinite'}} />
        <div style={{fontSize:'0.65rem', color:'var(--foreground-soft)'}}>Preparing interviewer...</div>
      </div>
    </div>
  );
}
